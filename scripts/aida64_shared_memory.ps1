$ErrorActionPreference = 'SilentlyContinue'
param(
  [int]$IntervalMs = 1000
)

$interval = [Math]::Max(50, [Math]::Min(5000, $IntervalMs))

function Decode-HtmlText([string]$text) {
    if ([string]::IsNullOrEmpty($text)) { return '' }
    try {
        return [System.Net.WebUtility]::HtmlDecode($text)
    } catch {
        return $text
    }
}

function Read-Aida64SharedMemory {
    $names = @(
        'AIDA64_SensorValues',
        'Global\AIDA64_SensorValues',
        'Local\AIDA64_SensorValues'
    )
    foreach ($n in $names) {
        try {
            $mmf = [System.IO.MemoryMappedFiles.MemoryMappedFile]::OpenExisting($n, [System.IO.MemoryMappedFiles.MemoryMappedFileRights]::Read)
            if ($mmf) {
                $stream = $mmf.CreateViewStream(0, 0, [System.IO.MemoryMappedFiles.MemoryMappedFileAccess]::Read)
                $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::Default)
                $raw = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                $mmf.Dispose()
                if ($raw) {
                    $nullIdx = $raw.IndexOf([char]0)
                    if ($nullIdx -ge 0) { $raw = $raw.Substring(0, $nullIdx) }
                    $trimmed = $raw.Trim()
                    if ($trimmed -and $trimmed.IndexOf('<') -ge 0) {
                        return $trimmed
                    }
                }
            }
        } catch {
            # Shared memory not yet created or different security token
        }
    }
    return $null
}

function Read-Aida64Registry {
    $regPaths = @(
        'HKCU:\Software\FinalWire\AIDA64\SensorValues',
        'HKLM:\SOFTWARE\FinalWire\AIDA64\SensorValues'
    )
    foreach ($rp in $regPaths) {
        try {
            if (Test-Path $rp) {
                $props = Get-ItemProperty -Path $rp -ErrorAction SilentlyContinue
                if ($props) {
                    $xml = "<root>"
                    $found = $false
                    foreach ($p in $props.PSObject.Properties) {
                        $pName = $p.Name
                        if ($pName -match '^Value\.(.+)$') {
                            $id = $matches[1]
                            $val = "$($p.Value)"
                            $labelProp = "Label.$id"
                            $label = if ($props.$labelProp) { "$($props.$labelProp)" } else { $id }
                            $xml += "<sensor><id>$id</id><label>$label</label><value>$val</value></sensor>"
                            $found = $true
                        }
                    }
                    $xml += "</root>"
                    if ($found) {
                        return $xml
                    }
                }
            }
        } catch {}
    }
    return $null
}

function Read-Aida64Wmi {
    try {
        $wmiItems = Get-CimInstance -Namespace 'root\wmi' -ClassName 'AIDA64_SensorValues' -ErrorAction SilentlyContinue
        if ($wmiItems) {
            $xml = "<root>"
            $found = $false
            foreach ($item in $wmiItems) {
                $id = "$($item.ID)"
                $label = "$($item.Label)"
                $val = "$($item.Value)"
                if ($id -or $label) {
                    $xml += "<sensor><id>$id</id><label>$label</label><value>$val</value></sensor>"
                    $found = $true
                }
            }
            $xml += "</root>"
            if ($found) { return $xml }
        }
    } catch {}
    return $null
}

function Get-SensorCategoryAndUnit([string]$kind, [string]$id, [string]$label) {
    $l = "$label".ToLowerInvariant()
    $k = "$kind".ToLowerInvariant()
    $i = "$id".ToLowerInvariant()

    if ($k -eq 'temp' -or $i -match '^t' -or $l -match 'temperature|temp|hotspot|diode|tjmax|core #') {
        return @{ kind = 'temp'; unit = '°C' }
    }
    if ($k -eq 'fan' -or $i -match '^f' -or $l -match 'fan|rpm|pump|cooler') {
        return @{ kind = 'fan'; unit = 'RPM' }
    }
    if ($k -eq 'volt' -or $i -match '^v' -or $l -match 'voltage|volt|vcore|vdimm|vbat|\+12v|\+5v|\+3\.3v') {
        return @{ kind = 'volt'; unit = 'V' }
    }
    if ($k -eq 'pwr' -or $i -match '^p' -or $l -match 'power|package power|watt|tdp|draw') {
        return @{ kind = 'pwr'; unit = 'W' }
    }
    if ($k -eq 'curr' -or $i -match '^i' -or $l -match 'current|amp|amperage') {
        return @{ kind = 'curr'; unit = 'A' }
    }
    if ($k -eq 'util' -or $i -match 'uti|^u' -or $l -match 'utilization|usage|load|percent|%') {
        return @{ kind = 'util'; unit = '%' }
    }
    if ($k -eq 'clock' -or $i -match '^c' -or $l -match 'clock|frequency|speed|mhz|ghz') {
        return @{ kind = 'clock'; unit = 'MHz' }
    }
    if ($k -eq 'net' -or $i -match '^n' -or $l -match 'download|upload|read rate|write rate|throughput|kb/s|mb/s') {
        return @{ kind = 'net'; unit = 'KB/s' }
    }
    if ($k -eq 'mem' -or $i -match '^m' -or $l -match 'space|memory|ram|vram|swap|pagefile') {
        return @{ kind = 'mem'; unit = 'MB' }
    }
    if ($k -eq 'sys' -or $i -match '^s' -or $l -match 'date|time|year|month|day|uptime|os|system|version|battery') {
        return @{ kind = 'sys'; unit = '' }
    }
    return @{ kind = if ($k -and $k -ne 'sensor' -and $k -ne 'root') { $k } else { 'sensor' }; unit = '' }
}

function Parse-SensorNumber([string]$rawStr) {
    if ([string]::IsNullOrWhiteSpace($rawStr)) { return 0.0 }
    $s = $rawStr.Trim()
    # Strip common units and spaces
    $cleaned = $s -replace '(?i)(°c|c|%|rpm|mhz|ghz|v|w|a|kb/s|mb/s|gb/s|kb|mb|gb|tb|b)', ''
    $cleaned = ($cleaned -replace ',', '.').Trim()
    
    # Match first valid numeric token (integer or float)
    if ($cleaned -match '[-+]?[0-9]*\.?[0-9]+') {
        $numPart = $matches[0]
        $parsed = 0.0
        if ([double]::TryParse($numPart, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
            return $parsed
        }
    }
    return 0.0
}

while ($true) {
    $started = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    try {
        $xmlish = Read-Aida64SharedMemory
        $sourceType = 'shared-memory'
        if (-not $xmlish) {
            $xmlish = Read-Aida64Registry
            if ($xmlish) { $sourceType = 'registry' }
        }
        if (-not $xmlish) {
            $xmlish = Read-Aida64Wmi
            if ($xmlish) { $sourceType = 'wmi' }
        }

        $sensors = @()
        if ($xmlish) {
            $cleanXml = $xmlish.Trim()
            # If wrapped in outer <sys>...</sys> that encloses children, strip the outer container
            if ($cleanXml -match '^<sys>(?<content>[\s\S]*)</sys>$' -and $matches['content'] -match '<[A-Za-z0-9_:-]+>') {
                $cleanXml = $matches['content']
            }
            if ($cleanXml -match '^<root>(?<content>[\s\S]*)</root>$') {
                $cleanXml = $matches['content']
            }

            # Match each leaf tag block
            $itemMatches = [regex]::Matches($cleanXml, '(?si)<(?<kind>[A-Za-z0-9_:-]+)>(?<inner>[\s\S]*?)</\k<kind>>')
            foreach ($im in $itemMatches) {
                $kindTag = $im.Groups['kind'].Value
                $inner = $im.Groups['inner'].Value

                $idMatch = [regex]::Match($inner, '(?si)<id>(?<val>.*?)</id>')
                $labelMatch = [regex]::Match($inner, '(?si)<label>(?<val>.*?)</label>')
                $valMatch = [regex]::Match($inner, '(?si)<value>(?<val>.*?)</value>')

                if ($valMatch.Success) {
                    $raw = Decode-HtmlText $valMatch.Groups['val'].Value.Trim()
                    $id = if ($idMatch.Success) { (Decode-HtmlText $idMatch.Groups['val'].Value.Trim()) } else { "$kindTag" }
                    $label = if ($labelMatch.Success) { (Decode-HtmlText $labelMatch.Groups['val'].Value.Trim()) } else { $id }
                    
                    $catUnit = Get-SensorCategoryAndUnit $kindTag $id $label
                    $numVal = Parse-SensorNumber $raw

                    $sensors += [pscustomobject]@{
                        id = $id
                        label = $label
                        value = $numVal
                        rawValue = $raw
                        unit = $catUnit.unit
                        kind = $catUnit.kind
                        updatedAt = [DateTime]::UtcNow.ToString('o')
                    }
                }
            }
        }

        $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $connected = $sensors.Count -gt 0
        $errorText = if (-not $xmlish) {
            'AIDA64 shared memory / registry / WMI is not currently detected. Ensure AIDA64 is running with External Applications enabled.'
        } elseif (-not $connected) {
            'AIDA64 data source was found, but no active sensor entries were parsed.'
        } else {
            $null
        }

        $hz = if ($interval -gt 0) { [Math]::Round(1000.0 / $interval, 2) } else { 0 }
        $result = [pscustomobject]@{
            connected = $connected
            source = if ($connected) { $sourceType } else { 'none' }
            timestamp = [DateTime]::UtcNow.ToString('o')
            updateRateHz = $hz
            sensorCount = $sensors.Count
            latencyMs = ($now - $started)
            sensors = @($sensors)
            error = $errorText
        }
        $result | ConvertTo-Json -Compress -Depth 5
    } catch {
        [pscustomobject]@{
            connected = $false
            source = 'none'
            timestamp = [DateTime]::UtcNow.ToString('o')
            updateRateHz = 0
            sensorCount = 0
            latencyMs = 0
            sensors = @()
            error = "$($_.Exception.Message)"
        } | ConvertTo-Json -Compress -Depth 5
    }
    Start-Sleep -Milliseconds $interval
}

