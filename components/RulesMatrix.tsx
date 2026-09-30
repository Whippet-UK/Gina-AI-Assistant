import React, { useState, useMemo } from 'react';
import { Lock, Search, Filter, ShieldCheck, ChevronRight, Info, CheckCircle2 } from 'lucide-react';
import { RuleSafeguard } from '../types';
import { ALL_RULES_MATRIX } from '../data/rulesData';

export const RulesMatrix: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeRuleModal, setActiveRuleModal] = useState<RuleSafeguard | null>(null);

  const categories = useMemo(() => {
    const cats = ['ALL', ...Array.from(new Set(ALL_RULES_MATRIX.map(r => r.category)))];
    return cats;
  }, []);

  const filteredRules = useMemo(() => {
    return ALL_RULES_MATRIX.filter(item => {
      const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = 
        searchTerm === '' ||
        item.range.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rules.some(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 mb-3.5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
              AUTOMATION SAFEGUARDS MATRIX (947 RULES)
            </h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
              947 SHIELDS LOCKED
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Explicit Rule Inventory hardcoded into system architecture & execution pipelines.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter 947 rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer font-mono"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Rule Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rules Category Quick Pills */}
      <div className="flex flex-wrap gap-1 mb-3 max-h-20 overflow-y-auto custom-scrollbar p-1 bg-slate-950 rounded border border-slate-800">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Rules Log Window */}
      <div className="bg-slate-950 border border-slate-800 rounded h-80 overflow-y-auto font-mono text-xs p-2.5 custom-scrollbar">
        {filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Filter className="w-6 h-6 mb-1.5 opacity-50" />
            <p className="text-[11px]">No matching safeguards found for "{searchTerm}"</p>
          </div>
        ) : (
          filteredRules.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveRuleModal(item)}
              className="group p-2 border-b border-slate-900 hover:bg-slate-900/60 transition-colors rounded cursor-pointer mb-1"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] px-1.5 py-0.2 rounded font-bold">
                    [{item.range}]
                  </span>
                  <span className="text-sky-300 font-bold tracking-tight text-[11px]">
                    {item.category.toUpperCase()}
                  </span>
                  <span className="text-slate-500 text-[10px] hidden sm:inline">— {item.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    item.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                    item.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {item.severity}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
              <div className="text-slate-300 text-[10px] pl-2 border-l-2 border-slate-800 group-hover:border-emerald-400 transition-colors">
                {item.rules.slice(0, 4).join(' | ')}
                {item.rules.length > 4 && (
                  <span className="text-slate-500 ml-2 font-semibold">
                    +{item.rules.length - 4} more rules...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rule Detail Modal */}
      {activeRuleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-2xl w-full p-5 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Safeguard [{activeRuleModal.range}]: {activeRuleModal.category}
                  </h3>
                  <p className="text-xs text-slate-400">{activeRuleModal.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveRuleModal(null)}
                className="text-slate-400 hover:text-slate-200 text-base font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Severity:</span>
                <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 text-[10px]">
                  {activeRuleModal.severity}
                </span>
                <span className="text-slate-500 ml-3">Compliance Lock:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> HARDCODED
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded p-3 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5">
                {activeRuleModal.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-1 border-b border-slate-900 last:border-0">
                    <span className="text-emerald-400 font-bold text-[10px]">#{idx + 1}</span>
                    <span className="text-slate-300 text-[11px]">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveRuleModal(null)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition-colors uppercase tracking-tight"
              >
                Acknowledge Safeguards
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
