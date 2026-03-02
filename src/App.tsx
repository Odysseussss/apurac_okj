import React, { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  DollarSign,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
  Settings2,
  FileDown,
  PlusCircle,
  History,
  LayoutDashboard,
  Layers,
  Package,
  Save,
  Trash2
} from 'lucide-react';

// --- INTERFACES ---

interface Product {
  codigoproduto?: string | number;
  'código do produto'?: string | number;
  codigo?: string | number;
  Código?: string | number;
  Categoria?: string;
  categoria?: string;
  Descricao?: string;
  Descrição?: string;
  produto?: string;
}

interface Sale {
  codigoproduto?: string | number;
  'código do produto'?: string | number;
  codigo?: string | number;
  Código?: string | number;
  Rca?: string;
  RCA?: string;
  'Código Cliente'?: string | number;
  cliente?: string | number;
  Cliente?: string | number;
  'Pedido de venda - Quantidade de itens'?: string | number;
  'quantidade de unidades vendidas'?: string | number;
  Quantidade?: string | number;
}

interface TieredRule {
  category: string;
  min: number;
  prize: number;
}

interface ComboRule {
  products: string[];
  prize: number;
}

interface Customer {
  id: string;
  totalQtd: number;
  ganhou: boolean;
  premio: number;
  categories: Record<string, number>;
  products: Set<string>;
}

interface RcaData {
  name: string;
  clientes: Customer[];
  totalPremiacao: number;
  totalVendas: number;
  clientesAtendidos: number;
  clientesPremiados: number;
}

interface HistoryEntry {
  id: number;
  date: string;
  mechanic: string;
  totals: {
    premiacao: number;
    rcas: number;
    premiados: number;
  };
  rcas: number;
}

// Estendendo o objeto window
declare global {
  interface Window {
    XLSX: any;
  }
}

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [activeView, setActiveView] = useState<'new' | 'history'>('new');
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRca, setExpandedRca] = useState<string | null>(null);
  const [xlsxLoaded, setXlsxLoaded] = useState(false);

  // Histórico persistente
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('apuracao_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Configurações da Mecânica Dinâmica
  const [mechanicType, setMechanicType] = useState<'min' | 'tiered' | 'combo'>('min');
  const [minItems, setMinItems] = useState(7);
  const [prizeValue, setPrizeValue] = useState(10);

  // Configurações de Mecânicas Avançadas
  const [tieredRules, setTieredRules] = useState<TieredRule[]>([]);
  const [comboRules, setComboRules] = useState<ComboRule[]>([]);

  // Categorias extraídas dos produtos
  const categories = useMemo(() => {
    const cats = new Set(productsData.map(p => p.Categoria || p.categoria || 'Sem Categoria'));
    return Array.from(cats).filter(c => c !== 'Sem Categoria');
  }, [productsData]);

  // Carrega a biblioteca SheetJS para manipulação de arquivos Excel
  useEffect(() => {
    if (window.XLSX) {
      setXlsxLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => setXlsxLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, type: 'products' | 'sales') => {
    if (!xlsxLoaded || !e.target.files) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = window.XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = window.XLSX.utils.sheet_to_json(ws) as any[];

        if (type === 'products') {
          setProductsData(data);
        } else {
          setSalesData(data);
        }
      } catch (err) {
        console.error("Erro ao ler arquivo:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Processamento dos dados baseado na mecânica selecionada
  const results = useMemo<RcaData[] | null>(() => {
    if (productsData.length === 0 || salesData.length === 0) return null;

    const productMap: Record<string, { category: string; name: string }> = {};
    productsData.forEach(p => {
      const code = String(p.codigoproduto || p['código do produto'] || p.codigo || p.Código || '').trim();
      if (!code) return;
      productMap[code] = {
        category: p.Categoria || p.categoria || 'Sem Categoria',
        name: p.Descricao || p.Descrição || p.produto || 'Produto'
      };
    });

    const rcaMap: Record<string, { name: string; clientes: Record<string, Customer>; totalPremiacao: number; totalVendas: number }> = {};

    salesData.forEach(sale => {
      const prodCode = String(sale.codigoproduto || sale['código do produto'] || sale.codigo || sale.Código || '').trim();
      const product = productMap[prodCode];
      if (!product) return;

      const rcaName = String(sale.Rca || sale.RCA || 'Sem RCA').trim();
      const clienteId = String(sale['Código Cliente'] || sale['cliente'] || sale.Cliente || 'Desconhecido').trim();

      const rawQtd = sale['Pedido de venda - Quantidade de itens'] || sale['quantidade de unidades vendidas'] || sale.Quantidade || 0;
      const qtd = Math.max(0, parseInt(String(rawQtd)) || 0);

      if (!rcaMap[rcaName]) {
        rcaMap[rcaName] = { name: rcaName, clientes: {}, totalPremiacao: 0, totalVendas: 0 };
      }

      if (!rcaMap[rcaName].clientes[clienteId]) {
        rcaMap[rcaName].clientes[clienteId] = {
          id: clienteId,
          totalQtd: 0,
          ganhou: false,
          premio: 0,
          categories: {},
          products: new Set<string>()
        };
      }

      const client = rcaMap[rcaName].clientes[clienteId];
      client.totalQtd += qtd;
      client.products.add(prodCode);

      const cat = product.category;
      client.categories[cat] = (client.categories[cat] || 0) + qtd;

      rcaMap[rcaName].totalVendas += qtd;
    });

    const finalData: RcaData[] = Object.values(rcaMap).map(rca => {
      let premiacaoRca = 0;
      const clientesArray = Object.values(rca.clientes).map(c => {
        let ganhou = false;
        let premio = 0;

        if (mechanicType === 'min') {
          ganhou = c.totalQtd >= minItems;
          if (ganhou) premio = prizeValue;
        } else if (mechanicType === 'tiered') {
          tieredRules.forEach(rule => {
            if (!rule.category) return;
            const qtdCat = c.categories[rule.category] || 0;
            if (qtdCat >= rule.min) {
              premio += rule.prize;
              ganhou = true;
            }
          });
        } else if (mechanicType === 'combo') {
          comboRules.forEach(rule => {
            if (rule.products.length === 0) return;
            const hasAll = rule.products.every(pCode => c.products.has(String(pCode)));
            if (hasAll) {
              premio += rule.prize;
              ganhou = true;
            }
          });
        }

        premiacaoRca += premio;
        return { ...c, ganhou, premio };
      });

      return {
        ...rca,
        clientes: clientesArray,
        totalPremiacao: premiacaoRca,
        clientesAtendidos: clientesArray.length,
        clientesPremiados: clientesArray.filter(c => c.ganhou).length
      };
    });

    return finalData.sort((a, b) => b.totalPremiacao - a.totalPremiacao);
  }, [productsData, salesData, mechanicType, minItems, prizeValue, tieredRules, comboRules]);

  const totals = useMemo(() => {
    if (!results) return { premiacao: 0, rcas: 0, premiados: 0 };
    return {
      premiacao: results.reduce((acc, curr) => acc + curr.totalPremiacao, 0),
      rcas: results.length,
      premiados: results.reduce((acc, curr) => acc + curr.clientesPremiados, 0)
    };
  }, [results]);

  const saveToHistory = () => {
    if (!results) return;
    const newEntry: HistoryEntry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      mechanic: mechanicType,
      totals: totals,
      rcas: results.length
    };
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('apuracao_history', JSON.stringify(updatedHistory));
    alert('Apuração salva no histórico!');
  };

  const deleteHistoryItem = (id: number) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('apuracao_history', JSON.stringify(updatedHistory));
  };

  const exportToExcel = () => {
    if (!results) return;
    const exportData = results.map(r => ({
      'RCA': r.name,
      'Total Vendas (Unidades)': r.totalVendas,
      'Clientes Positivados': r.clientesAtendidos,
      'Clientes Premiados': r.clientesPremiados,
      'Premiação Total (R$)': r.totalPremiacao
    }));
    const ws = window.XLSX.utils.json_to_sheet(exportData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Apuração");
    window.XLSX.writeFile(wb, `Apuracao_${mechanicType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredResults = useMemo(() => {
    return results?.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];
  }, [results, searchTerm]);

  // Sidebar Item Component
  const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 lg:translate-x-2'
        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
        }`}
    >
      <Icon size={20} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-100 p-6 flex flex-col gap-10 fixed h-full z-30 transition-all duration-500 shadow-[20px_0_40px_-20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-lg shadow-indigo-100 rotate-3">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tighter leading-none">APURAC <span className="text-indigo-600">PORTAL</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">v0.2 OkajimaBI</p>
          </div>
        </div>

        <nav className="flex flex-col gap-3 flex-grow">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em] px-4 mb-2">Menu Principal</p>
          <SidebarItem
            icon={PlusCircle}
            label="Nova Apuração"
            active={activeView === 'new'}
            onClick={() => setActiveView('new')}
          />
          <SidebarItem
            icon={History}
            label="Meu Histórico"
            active={activeView === 'history'}
            onClick={() => setActiveView('history')}
          />
        </nav>

        <div className="mt-auto p-5 bg-gradient-to-br from-slate-50 to-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              OD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-800 truncate">Lilicos</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Analista Responsável</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow ml-64 min-h-screen transition-all duration-500">
        {activeView === 'new' ? (
          <div className="pb-20">
            {/* Header Premium */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-8 sticky top-0 z-20">
              <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Configurar Apuração</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Defina as regras e suba as planilhas para processar.</p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="group relative">
                    <label className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-pointer transition-all border-2 ${productsData.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'} shadow-sm text-xs font-black uppercase tracking-widest`}>
                      <Package size={18} className={productsData.length > 0 ? 'animate-bounce' : ''} />
                      <span>{productsData.length > 0 ? "Produtos OK" : "1. Produtos"}</span>
                      <input type="file" className="hidden" accept=".xlsx, .csv" onChange={(e) => handleFileUpload(e, 'products')} />
                    </label>
                  </div>
                  <div className="group relative">
                    <label className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-pointer transition-all border-2 ${salesData.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-600'} shadow-sm text-xs font-black uppercase tracking-widest`}>
                      <FileSpreadsheet size={18} className={salesData.length > 0 ? 'animate-bounce' : ''} />
                      <span>{salesData.length > 0 ? "Vendas OK" : "2. Vendas"}</span>
                      <input type="file" className="hidden" accept=".xlsx, .csv" onChange={(e) => handleFileUpload(e, 'sales')} />
                    </label>
                  </div>
                </div>
              </div>
            </header>

            <div className="max-w-6xl mx-auto p-8 space-y-10">
              {/* Seleção de Mecânica com Tabs Premium */}
              <section className="bg-white p-2 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 flex gap-2">
                <button
                  onClick={() => setMechanicType('min')}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[24px] transition-all duration-500 font-black text-xs uppercase tracking-widest ${mechanicType === 'min' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Layers size={18} /> Metas Simples
                </button>
                <button
                  onClick={() => setMechanicType('tiered')}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[24px] transition-all duration-500 font-black text-xs uppercase tracking-widest ${mechanicType === 'tiered' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <TrendingUp size={18} /> Escalonada
                </button>
                <button
                  onClick={() => setMechanicType('combo')}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[24px] transition-all duration-500 font-black text-xs uppercase tracking-widest ${mechanicType === 'combo' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Package size={18} /> Combo
                </button>
              </section>

              {/* Configuração Dinâmica - Interface Dark Premium */}
              <section className="bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-indigo-100 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-indigo-500/20"></div>

                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                      <Settings2 size={24} />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">Parametros da Campanha</h3>
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    Motor v2.0
                  </div>
                </div>

                {mechanicType === 'min' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Corte Mínimo (Itens)</label>
                        <span className="text-3xl font-black text-indigo-400 tabular-nums">{minItems}</span>
                      </div>
                      <input
                        type="range" min="1" max="50" value={minItems}
                        onChange={(e) => setMinItems(Number(e.target.value))}
                        className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                        <span>1 UNIDADE</span>
                        <span>50 UNIDADES</span>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Bonificação (R$ / Cliente)</label>
                      <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
                        <span className="text-2xl font-black text-indigo-500/50 ml-2">BRL</span>
                        <input
                          type="number" value={prizeValue}
                          onChange={(e) => setPrizeValue(Number(e.target.value))}
                          className="bg-transparent border-none text-white text-3xl font-black outline-none w-full tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {mechanicType === 'tiered' && (
                  <div className="space-y-6 pt-4">
                    {tieredRules.map((rule, idx) => (
                      <div key={idx} className="flex flex-wrap items-end gap-6 bg-white/5 p-6 rounded-[32px] border border-white/5 animate-in fade-in zoom-in duration-300">
                        <div className="flex-grow min-w-[240px] space-y-3">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Categoria Selecionada</label>
                          <select
                            value={rule.category}
                            onChange={(e) => {
                              const newRules = [...tieredRules];
                              newRules[idx].category = e.target.value;
                              setTieredRules(newRules);
                            }}
                            className="w-full bg-slate-800 text-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none border border-white/5 focus:border-indigo-500 appearance-none shadow-xl"
                          >
                            <option value="">Escolher Categoria...</option>
                            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div className="w-32 space-y-3">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Meta</label>
                          <input
                            type="number" value={rule.min}
                            onChange={(e) => {
                              const newRules = [...tieredRules];
                              newRules[idx].min = Number(e.target.value);
                              setTieredRules(newRules);
                            }}
                            className="w-full bg-slate-800 text-white rounded-2xl px-5 py-3.5 font-black text-center outline-none border border-white/5"
                          />
                        </div>
                        <div className="w-32 space-y-3">
                          <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Valor R$</label>
                          <input
                            type="number" value={rule.prize}
                            onChange={(e) => {
                              const newRules = [...tieredRules];
                              newRules[idx].prize = Number(e.target.value);
                              setTieredRules(newRules);
                            }}
                            className="w-full bg-slate-800 text-white rounded-2xl px-5 py-3.5 font-black text-center outline-none border border-white/5 text-indigo-400"
                          />
                        </div>
                        <button
                          onClick={() => setTieredRules(tieredRules.filter((_, i) => i !== idx))}
                          className="bg-red-500/10 text-red-400 p-4 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-300 mb-0.5"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setTieredRules([...tieredRules, { category: '', min: 0, prize: 0 }])}
                      className="w-full py-5 border-2 border-dashed border-white/10 rounded-[32px] text-slate-500 font-black text-xs uppercase tracking-[0.3em] hover:bg-white/5 hover:text-indigo-400 hover:border-indigo-500/50 transition-all duration-500 flex items-center justify-center gap-3"
                    >
                      <PlusCircle size={20} /> Nova Regra por Categoria
                    </button>
                  </div>
                )}

                {mechanicType === 'combo' && (
                  <div className="space-y-6 pt-4">
                    {comboRules.map((rule, idx) => (
                      <div key={idx} className="bg-white/5 p-8 rounded-[40px] border border-white/5 space-y-6 relative group animate-in slide-in-from-right duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Configuração de Combo #{idx + 1}</h4>
                          </div>
                          <button
                            onClick={() => setComboRules(comboRules.filter((_, i) => i !== idx))}
                            className="bg-white/5 hover:bg-red-500 text-slate-400 hover:text-white px-4 py-2 rounded-xl transition-all font-bold text-[10px] uppercase"
                          >
                            Descartar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 space-y-3">
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Códigos dos SKUs (Ex: CC01, CC02, 3456...)</label>
                            <input
                              type="text"
                              placeholder="Liste os códigos separados por vírgula para formar o combo"
                              value={rule.products.join(', ')}
                              onChange={(e) => {
                                const newRules = [...comboRules];
                                newRules[idx].products = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                                setComboRules(newRules);
                              }}
                              className="w-full bg-slate-800 text-white rounded-2xl px-6 py-4 text-sm font-medium outline-none border border-white/5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-600"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Valor do Prêmio (BRL)</label>
                            <input
                              type="number"
                              value={rule.prize}
                              onChange={(e) => {
                                const newRules = [...comboRules];
                                newRules[idx].prize = Number(e.target.value);
                                setComboRules(newRules);
                              }}
                              className="w-full bg-slate-800 text-indigo-400 rounded-2xl px-6 py-4 font-black outline-none border border-white/5"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setComboRules([...comboRules, { products: [], prize: 0 }])}
                      className="w-full py-5 border-2 border-dashed border-white/10 rounded-[32px] text-slate-500 font-black text-xs uppercase tracking-[0.3em] hover:bg-white/5 hover:text-indigo-400 hover:border-indigo-500/50 transition-all duration-500 flex items-center justify-center gap-3"
                    >
                      <PlusCircle size={20} /> Adicionar Novo Combo à Mecânica
                    </button>
                  </div>
                )}
              </section>

              {!results ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[60px] border-2 border-dashed border-slate-100 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.05)]">
                  <div className="bg-indigo-50 p-12 rounded-[40px] mb-8 animate-pulse">
                    <FileSpreadsheet size={80} className="text-indigo-200" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tighter">Pronto para Apurar?</h3>
                  <p className="text-slate-400 text-center max-w-sm font-medium leading-relaxed">
                    Carregue os arquivos XLSX de <b>Produtos Participantes</b> e <b>Vendas de Pedidos</b> para iniciar os cálculos.
                  </p>
                </div>
              ) : (
                <>
                  {/* DASHBOARD RESUMO REDESENHADO */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-[48px] shadow-[20px_20px_40px_-10px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 text-emerald-600">
                        <DollarSign size={100} />
                      </div>
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <DollarSign size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montante Total</p>
                        <p className="text-4xl font-black text-slate-800 tabular-nums">R$ {totals.premiacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[48px] shadow-[20px_20px_40px_-10px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 text-indigo-600">
                        <Users size={100} />
                      </div>
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <Users size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RCAs Filtrados</p>
                        <p className="text-4xl font-black text-slate-800 tabular-nums">{totals.rcas}</p>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[48px] shadow-[20px_20px_40px_-10px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col gap-6 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                      <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 text-orange-600">
                        <CheckCircle2 size={100} />
                      </div>
                      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                        <CheckCircle2 size={28} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clientes Pagos</p>
                        <p className="text-4xl font-black text-slate-800 tabular-nums">{totals.premiados}</p>
                      </div>
                    </div>
                  </div>

                  {/* LISTAGEM DE RESULTADOS ENTERPRISE STYLE */}
                  <div className="bg-white rounded-[56px] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
                    <div className="p-10 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-center gap-10 bg-gradient-to-r from-white to-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-3">Resultados da Apuração</p>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Ranking de Performance</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                        <div className="relative flex-grow min-w-[300px]">
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                          <input
                            type="text"
                            placeholder="Pesquisar por nome do representante..."
                            className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-black transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={saveToHistory}
                          className="bg-indigo-600 text-white px-8 py-5 rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 font-black text-xs uppercase tracking-widest"
                        >
                          <Save size={20} /> Salvar Sessão
                        </button>
                        <button
                          onClick={exportToExcel}
                          className="bg-white text-slate-800 px-8 py-5 rounded-[24px] border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all shadow-sm flex items-center gap-3 font-black text-xs uppercase tracking-widest"
                        >
                          <Download size={20} className="text-emerald-600" /> Exportar Relatório
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-400 uppercase text-[9px] font-black tracking-[0.3em]">
                          <tr>
                            <th className="px-10 py-8">RCA / Representante Comercial</th>
                            <th className="px-10 py-8 text-center">Volume Total</th>
                            <th className="px-10 py-8 text-center">Clientes Positivos</th>
                            <th className="px-10 py-8 text-right">Cash Out Estimado</th>
                            <th className="px-10 py-8 text-center">Visualização</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredResults.map((rca, idx) => (
                            <React.Fragment key={idx}>
                              <tr className={`group hover:bg-indigo-50/20 transition-all duration-300 ${expandedRca === rca.name ? 'bg-indigo-50/40' : ''}`}>
                                <td className="px-10 py-8">
                                  <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-[20px] bg-slate-50 group-hover:bg-white flex items-center justify-center font-black text-slate-400 text-sm shadow-sm transition-colors border border-slate-100">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <span className="font-black text-slate-800 text-lg tracking-tight block">{rca.name}</span>
                                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{rca.clientesAtendidos} Clientes na carteira</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                  <span className="text-base font-black text-slate-600 tabular-nums">{rca.totalVendas} <span className="text-[10px] text-slate-300">UN</span></span>
                                </td>
                                <td className="px-10 py-8 text-center">
                                  <div className="inline-flex items-center gap-3 px-5 py-2 bg-white border border-orange-100 text-orange-600 rounded-2xl text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                    <CheckCircle2 size={16} /> {rca.clientesPremiados}
                                  </div>
                                </td>
                                <td className="px-10 py-8 text-right">
                                  <span className="font-black text-emerald-600 text-xl tracking-tight tabular-nums">R$ {rca.totalPremiacao.toFixed(2)}</span>
                                </td>
                                <td className="px-10 py-8 text-center">
                                  <button
                                    onClick={() => setExpandedRca(expandedRca === rca.name ? null : rca.name)}
                                    className={`p-4 rounded-[20px] transition-all duration-500 hover:rotate-6 ${expandedRca === rca.name ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 shadow-sm'}`}
                                  >
                                    {expandedRca === rca.name ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                  </button>
                                </td>
                              </tr>

                              {expandedRca === rca.name && (
                                <tr className="animate-in fade-in duration-700">
                                  <td colSpan={5} className="px-10 py-0 border-none">
                                    <div className="pb-12 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                                      {rca.clientes.sort((a, b) => b.premio - a.premio || b.totalQtd - a.totalQtd).map((cli, cIdx) => (
                                        <div key={cIdx} className={`p-6 rounded-[32px] border-2 transition-all duration-500 scale-95 hover:scale-100 ${cli.ganhou ? 'bg-indigo-50/50 border-indigo-100 shadow-xl shadow-indigo-100/20' : 'bg-white border-slate-50 grayscale opacity-60'}`}>
                                          <div className="flex justify-between items-start mb-6">
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-50">
                                              <Users size={18} className={cli.ganhou ? 'text-indigo-600' : 'text-slate-200'} />
                                            </div>
                                            {cli.ganhou && (
                                              <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full shadow-lg shadow-emerald-100">Meta OK</span>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">ID CLIENTE</p>
                                            <p className="text-sm font-black text-slate-700 mb-4">{cli.id}</p>

                                            <div className="space-y-4 pt-4 border-t border-slate-100/50">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Volume</span>
                                                <span className="text-lg font-black text-slate-800 tabular-nums">{cli.totalQtd}</span>
                                              </div>
                                              <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Bonificação</span>
                                                <span className="text-lg font-black text-emerald-600 tabular-nums">R$ {cli.premio.toFixed(0)}</span>
                                              </div>
                                            </div>

                                            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-6 overflow-hidden">
                                              <div
                                                className={`h-full transition-all duration-1000 ${cli.ganhou ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                                style={{ width: `${Math.min((cli.totalQtd / 10) * 100, 100)}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* TELA DE HISTÓRICO PREMIUM */
          <div className="p-12 space-y-12 animate-in fade-in slide-in-from-left duration-700">
            <header className="flex justify-between items-end bg-white p-12 rounded-[56px] border border-slate-100 shadow-xl shadow-slate-100/50">
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">Relatórios de Campanhas</p>
                <h2 className="text-5xl font-black text-slate-800 tracking-tighter">MEU <span className="text-indigo-600">HISTÓRICO</span></h2>
                <p className="text-slate-400 font-medium text-lg mt-4 max-w-lg">Clique em visualizar detalhes para carregar uma apuração salva no motor de visualização.</p>
              </div>
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Salvo</p>
                  <p className="text-4xl font-black text-slate-800">{history.length}</p>
                </div>
              </div>
            </header>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 bg-zinc-50 rounded-[60px] border-2 border-dashed border-zinc-200">
                <div className="p-10 bg-white rounded-full shadow-2xl shadow-indigo-100/50 mb-10">
                  <History size={100} className="text-indigo-100" />
                </div>
                <h3 className="text-3xl font-black text-zinc-400 tracking-tighter">Sem registros.</h3>
                <button
                  onClick={() => setActiveView('new')}
                  className="mt-8 px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                >
                  Iniciar Primeira Apuração
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-20">
                {history.map(entry => (
                  <div key={entry.id} className="bg-white p-10 rounded-[56px] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.05)] border border-slate-50 hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>

                    <div className="flex justify-between items-start mb-10 relative">
                      <div className="p-5 bg-indigo-600 rounded-[28px] text-white shadow-xl shadow-indigo-100 group-hover:rotate-6 transition-all duration-500">
                        <LayoutDashboard size={28} />
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">REGISTRADO EM</p>
                        <p className="text-[11px] font-black text-slate-500">{entry.date.split(',')[0]}</p>
                      </div>
                    </div>

                    <h4 className="text-2xl font-black text-slate-800 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                      {entry.mechanic === 'min' ? 'Meta Por Unidades' : entry.mechanic === 'tiered' ? 'Regra Escalonada' : 'Combo Exclusivo'}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Campanha Automática</p>

                    <div className="space-y-6 pt-8 border-t border-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Payout</span>
                        <span className="text-2xl font-black text-emerald-600 tabular-nums">R$ {entry.totals.premiacao.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-3xl group-hover:bg-indigo-50 transition-colors">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Equipe</p>
                          <p className="text-lg font-black text-slate-800 tabular-nums">{entry.rcas}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-3xl group-hover:bg-indigo-50 transition-colors">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Ganhadores</p>
                          <p className="text-lg font-black text-slate-800 tabular-nums">{entry.totals.premiados}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                      <button
                        className="flex-grow py-5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[24px] shadow-2xl shadow-indigo-100 group-hover:bg-indigo-600 transition-all duration-500 active:scale-95"
                        onClick={() => {
                          alert('Carregando dados históricos no dashboard...');
                        }}
                      >
                        Revisar Planilhas
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(entry.id)}
                        className="p-5 bg-red-50 text-red-400 rounded-[24px] hover:bg-red-500 hover:text-white transition-all duration-300"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* STATUS HUD - PREMIUM FLOATING */}
      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-3 z-50 pointer-events-none">
        {xlsxLoaded && (
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl text-white px-8 py-5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-5 border border-white/10 group hover:scale-105 transition-all duration-500">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Motor de Processamento</p>
              <p className="text-xs font-black tracking-tight">Sincronizado & Local</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}