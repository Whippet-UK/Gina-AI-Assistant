import { RuleSafeguard } from '../types';

export const ALL_RULES_MATRIX: RuleSafeguard[] = [
  {
    id: "001-010",
    range: "001-010",
    category: "Ingestion Sanitization",
    title: "Input String Normalization & Text Sanitization",
    rules: [
      "Input_String_Normalization: Auto-strip non-printable Unicode characters",
      "CSV_Text_File_Auto_Fixing: Auto-repair broken quotes & CRLF line breaks",
      "Comment_Line_Ignoring: Strip lead '#' and '//' comments before processing",
      "Blacklist_Word_Filtering: Filter illegal/harmful keyword strings prior to execution",
      "Token_Boundary_Enforcement: Truncate oversized raw prompts at token 75",
      "Character_Encoding_Lock: Enforce strict UTF-8 input file reader stream",
      "Whitespace_Collapsing: Merge consecutive spaces and tabs into single whitespace",
      "Control_Code_Removal: Scrub ASCII 0x00-0x1F binary bytes from input buffers",
      "Regex_Pattern_Escaping: Escape nested regex special characters in template strings",
      "Sanitizer_Execution_Log: Write raw vs sanitized diff logs into temporary trace"
    ],
    severity: "HIGH",
    locked: true
  },
  {
    id: "011-020",
    range: "011-020",
    category: "Hardware Memory Buffer",
    title: "VRAM & CPU Resource Throttles",
    rules: [
      "Max_90_Percent_VRAM_Cap_Cage: Hard limit VRAM allocation to 7.2GB (90% of 8GB)",
      "4_Thread_CPU_Gate: Pin PyTorch & node worker processes to 4 CPU threads max",
      "80C_GPU_Thermal_Brake: Halt queue execution if GPU junction temp exceeds 80°C",
      "RAM_Directory_Temporary_Frame_Staging: Use RAM disk staging for intermediate video PNGs",
      "System_RAM_Safety_Margin: Reserve 8GB minimum system RAM for OS background operations",
      "Thread_Affinity_Lock: Bind processing threads to AMD Ryzen physical core indices",
      "Garbage_Collect_Sweep_Interval: Force Python garbage collection every 2 batch cycles",
      "PyTorch_CUDA_Empty_Cache: Call torch.cuda.empty_cache() after every render job",
      "Low_VRAM_Flag_Injection: Inject --lowvram --fp8_e4m3fn-text-enc flags into ComfyUI args",
      "VRAM_Fragmentation_Watchdog: Reset model weight tensors if VRAM fragmentation > 15%"
    ],
    severity: "CRITICAL",
    locked: true
  },
  {
    id: "021-030",
    range: "021-030",
    category: "Storage & Compliance",
    title: "Metadata & Storage Preservation",
    rules: [
      "Automated_300_DPI_Injection: Embed 300 DPI metadata into generated PNG headers",
      "Variable_Framerate_Stripping: Convert variable framerate MP4 clips to fixed 30fps",
      "Store_SEO_Metadata_Purging: Purge proprietary model paths before external file export",
      "35GB_SSD_Free_Space_Buffer: Block new generation if SSD free space drops under 35GB",
      "EXIF_Creation_Date_Anchor: Inject ISO-8601 creation timestamps into image EXIF",
      "Atomic_File_Write_Guard: Write temporary files to .tmp extension before renaming",
      "Directory_Traversal_Blocker: Sanitize filename paths against '../' escape attempts",
      "Case_Insensitive_Naming_Collision_Scrubber: Prevent file overwrite on Windows NTFS case collisions",
      "Auto_Archive_Old_Outputs: Compress output batches older than 14 days into zip archives",
      "Checksum_SHA256_Header_Writer: Compute and store SHA256 hashes in manifest JSON"
    ],
    severity: "HIGH",
    locked: true
  },
  {
    id: "031-040",
    range: "031-040",
    category: "Interface Workflow Guards",
    title: "Aspect & Rendering Geometry Shields",
    rules: [
      "Aspect_Drift_Locking: Lock aspect ratio parameters during resolution upscales",
      "Anti_Aliasing_Edge_Smoothing: Apply edge smoothing filter to vector transformations",
      "Multi_Frame_Flicker_Suppression_Filters: Temporal brightness smoothing across video frames",
      "Windows_260_Character_Path_Guard: Enforce UNC '\\\\?\\' prefix for long Windows path handles",
      "Canvas_Center_Crop_Filter: Auto-center crop outputs matching target aspect ratios",
      "Seam_Blending_Linear_Engine: Smooth tile boundaries during 4x-UltraSharp upscaling",
      "Color_Space_Rec709_Anchor: Standardize video output color profiles to Rec.709",
      "Transparent_Margin_Trimmer: Auto-crop empty zero-alpha margins from rendered SVGs",
      "Max_Resolution_Cap_4K: Limit output dimension to 3840x2160 pixels maximum",
      "ViewBox_Coordinate_Pass: Validate SVG viewBox coordinates prior to vector packaging"
    ],
    severity: "MEDIUM",
    locked: true
  },
  {
    id: "041-050",
    range: "041-050",
    category: "Network Exception Handling",
    title: "WebSocket & API Timeout Recoveries",
    rules: [
      "WebSocket_Auto_Rejoin: Auto-reconnect ComfyUI WebSocket endpoint within 500ms",
      "Orphan_Process_Task_Killer: Terminate frozen python.exe processes exceeding runtime limit",
      "10_Minute_API_Timeout_Extension: Set maximum HTTP queue timeout window to 600 seconds",
      "Dynamic_Drive_Letter_Mapping: Resolve sandbox drive letter across C:\\ or D:\\ environments",
      "Local_Loopback_127_Binding: Force backend servers to listen strictly on 127.0.0.1",
      "API_Request_Payload_Chunker: Split large base64 image requests into 2MB streaming chunks",
      "Heartbeat_Ping_Interval_5s: Send WebSocket ping every 5 seconds to prevent browser drop",
      "Network_Retry_Counter_Max_3: Attempt up to 3 automatic retries for transient socket errors",
      "Offline_Mode: Report unavailable local services; never substitute cloud generation",
      "Circuit_Breaker_Queue_Pause: Pause batch processing if 3 consecutive render jobs error out"
    ],
    severity: "CRITICAL",
    locked: true
  },
  {
    id: "051-060",
    range: "051-060",
    category: "Automation Environment Locks",
    title: "Sandbox & Dependency Isolation",
    rules: [
      "Root_Sandbox_Installation: Enforce execution exclusively inside C:\\Gina_AI\\ path",
      "Fixed_Version_Dependency_Pinning: Lock PyTorch, TorchVision, and CUDA to fixed minor build numbers",
      "Resilient_Download_Resume_Hooks: Support range header resume for large FP8 model downloads",
      "Single_Action_Fix_Isolation: Group error diagnostics into 1 actionable fix item",
      "Virtual_Env_Activation_Check: Verify python venv activation before executing scripts",
      "No_Global_Pip_Pollution: Block pip global installs; enforce local virtualenv context",
      "Admin_Privilege_Alert: Notify user if script is run with elevated Windows Admin rights",
      "DLL_Path_Precedence_Fix: Prepend CUDA bin directory to system PATH environment variable",
      "Model_Folder_Structure_Sentry: Verify models/checkpoints and models/loras directories exist",
      "Environment_Snapshot_Write: Save active environment freeze report on application launch"
    ],
    severity: "HIGH",
    locked: true
  },
  {
    id: "061-070",
    range: "061-070",
    category: "Crash Progress Manifests",
    title: "State Persistence & Recovery Systems",
    rules: [
      "Localized_State_Tracking_JSON_Logs: Persist current batch progress in state.json continuously",
      "Broken_File_Sweepers: Clean 0-byte incomplete image renders on system restart",
      "Network_Retry_Counters: Increment per-job retry tally before marking failed",
      "Native_OS_File_Handle_Releases: Explicitly close file handles in finally block after write",
      "Crash_Point_Resume_Engine: Auto-resume batch jobs from last verified completed prompt index",
      "Microsecond_Timestamp_Logger: Append microsecond ISO-8601 timestamps to log output",
      "Log_Rotation_Limit_5MB: Rotate log files when size exceeds 5MB to save disk I/O",
      "Graceful_Shutdown_Signal_Handler: Catch SIGINT/SIGTERM to save current step state",
      "Telemetry_Stream_Broadcast: Send real-time telemetry updates to UI frontend dashboard",
      "Desktop_Batch_Report_Writer: Generate markdown batch summary file on Desktop upon completion"
    ],
    severity: "HIGH",
    locked: true
  },
  {
    id: "111-120",
    range: "111-120",
    category: "Video Stitching Systems",
    title: "FFmpeg & Video Encoding Parameters",
    rules: [
      "FFmpeg_Mux_Frame_Rate_Anchor: Force video stitching to exactly 30 fps",
      "Constant_Rate_Factor_Ceiling_22: Lock H.264 video CRF quality parameter to 22",
      "YUV420p_Pixel_Format_Lock: Force pixel format to yuv420p for universal media compatibility",
      "Faststart_Metadata_Moov_Atom_Shift: Relocate MP4 moov atom to start of file for streaming playback",
      "Closed_GOP_Keyframe_Boundary_Mandate: Set keyframe interval to 30 frames (1 GOP per second)",
      "Broadcast_Frequency_Audio_Stabilizer: Resample companion audio tracks to 44.1kHz stereo PCM",
      "Seamless_Video_Playback_Loop_Verification: Ensure video start and end frames blend smoothly for loops",
      "No_Variable_Framerate_Pass: Reject variable framerate clips; force constant CFR conversion",
      "Audio_Video_Sync_Offset_Check: Align audio and video stream timestamps to within 5ms accuracy",
      "Container_Fast_Remux: Stream copy codecs when remuxing containers without re-encoding"
    ],
    severity: "HIGH",
    locked: true
  },
  {
    id: "451-550",
    range: "451-550",
    category: "Low-VRAM Disk Translation",
    title: "Quantized Model & Pagefile Safety",
    rules: [
      "Divisible_Matrix_Alignment: Ensure tensor dimensions are divisible by 8 for Tensor Core speed",
      "Step_By_Step_Processing_Chunks: Process FLUX.1 latent blocks in tile chunks on 8GB GPUs",
      "Screen_Freeze_Blocking: Yield CPU event loop every 10ms during heavy weight offloading",
      "Page_File_Thrash_Monitoring: Alert if Windows pagefile paging exceeds 2GB/sec rate",
      "Post_Output_File_Handle_Release: Force immediate closure of image stream references",
      "FLUX_FP8_Quantization_Lock: Use e4m3fn FP8 quantization for FLUX text encoder & UNet",
      "LTX_INT8_Video_Weight_Quant: Apply INT8 weight quantization for LTX-Video transformer layers",
      "Offload_Text_Encoder_To_CPU: Unload T5 text encoder from GPU VRAM immediately after CLIP encoding",
      "Sequential_Model_Loading_Gate: Load video generator model only after image generator model unloads",
      "VRAM_Defragmentation_Pass: Trigger CUDA memory defragmentation prior to long video renders"
    ],
    severity: "CRITICAL",
    locked: true
  },
  {
    id: "748-947",
    range: "748-947",
    category: "Extended Industrial Fortress Matrix",
    title: "Async Backup, Vector Smoothing & Production Shields",
    rules: [
      "Daily_Rot_Sentry: Execute automated SHA256 integrity check on offline model weights",
      "Backup_Mirror_Sync: Maintain duplicate local mirror of custom nodes in C:\\Gina_AI\\backup",
      "Log_Auto_Rotation_5MB: Rotate system telemetry log files upon reaching 5MB threshold",
      "Core_Primary_Display_VRAM_Reserve: Reserve 800MB VRAM specifically for Windows OS Display Compositor",
      "Bezier_Precision_Clamp_2: Clamp vector Bezier curve coordinate precision to 2 decimal places",
      "Path_Self_Intersection_Geometric_Flattening: Resolve self-intersecting vector paths automatically",
      "Root_Lock_Drive_C: Enforce sandbox path prefix matching C:\\Gina_AI\\ or C:\\AI_Project\\",
      "Max_Path_Ceiling_260: Prevent path truncation using Windows long path APIs",
      "EXIF_Purge_True: Remove camera serial numbers and author location metadata from exports",
      "Local_Host_Domain_Binding_Enforcer: Prevent external network access to internal API endpoints",
      "Single_Model_VRAM_Allocation_Gate: Allow maximum 1 AI diffusion model loaded in VRAM concurrently",
      "Progressive_Milestone_JSON_State_Saver: Save render state every 5 steps during latent diffusion",
      "Mosaic_Artifact_Grid_Smoother: Apply grid artifact reduction filter on FLUX FP8 latent decodes",
      "Finalized_Production_Execution_Batch_Report_Generator: Generate desktop HTML/MD report post batch completion"
    ],
    severity: "CRITICAL",
    locked: true
  }
];
