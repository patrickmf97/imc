import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, BarChart as BarChartIcon } from 'lucide-react';

// --- ARQUIVO ÚNICO: CONFIGURAÇÃO DE URL ---
// IMPORTANTE: Este URL DEVE ser o URL base do seu script do Google Apps implantado (sem o '?action=...').
// O URL de exemplo abaixo é o que estava presente no seu código Apps Script e Handler, mas você deve
// substituí-lo pelo URL do seu próprio script após a implantação.
const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbxJP0pn4YlWbrJfZxNNRmX0a54u-SSpsmn2RABrltzjxWbWO83c_bMXb6QkqkCqRJl3/exec';

const COLORS = ['#dc3545', '#ffc107', '#198754'];
const PRIMARY_ACCENT = '#00897B';
const ACCENT_GOLD = '#FFD700';
const SECONDARY_COLOR = '#343a40';

// Componente para campos de formulário
const FormField = ({ label, id, children, errors, tooltip = '' }) => (
  <div className="space-y-1">
    <div className="flex items-center space-x-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      {tooltip && (
        <span className="text-gray-400 hover:text-gray-600 transition duration-150" title={tooltip}>
          <Info size={16} />
        </span>
      )}
    </div>
    {children}
    {errors && <small className="text-red-500 text-xs mt-1">Preenchimento obrigatório.</small>}
  </div>
);

// Componente Principal
export default function App() {
  const [entries, setEntries] = useState([]);
  const [view, setView] = useState('form');
  const [successMessage, setSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { sexo: 'Masculino', idade: 25, peso: 70, altura: 1.75, diabetes: 'Não', hipertensao: 'Não', habitos: 'Moderado' }
  });

  // Funções de Cálculo (Mantidas)
  const calcIMC = (peso, altura) => Number((peso / (altura * altura)).toFixed(2));
  const imcCategoria = i => i < 18.5 ? 'Abaixo do peso' : i < 25 ? 'Normal' : i < 30 ? 'Sobrepeso' : 'Obesidade';
  const riskGroup = ({ idade, imc, diabetes, hipertensao, habitos }) => {
    let s = 0;
    if (idade >= 60) s += 3; else if (idade >= 45) s += 2; else if (idade >= 30) s += 1;
    if (imc >= 30) s += 3; else if (imc >= 25) s += 1;
    if (diabetes === 'Sim') s += 3;
    if (hipertensao === 'Sim') s += 2;
    if (habitos === 'Ruim') s += 2;
    if (habitos === 'Saudável') s -= 1;
    return s >= 6 ? 'Alto' : s >= 3 ? 'Moderado' : 'Baixo';
  };

  // 1. Função para buscar dados da planilha (GET)
  const fetchSheetData = async () => {
    setLoading(true);
    try {
      // CORREÇÃO: Chama o URL do GAS diretamente com action=getData
      const res = await fetch(`${GAS_BASE_URL}?action=getData`);
      const text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Resposta da planilha não é JSON:', text);
        return;
      }
      
      // Converte os campos numéricos
      const formatted = data.map(d => ({
        ...d,
        id: Number(d.id),
        idade: Number(d.idade),
        peso: Number(d.peso),
        altura: Number(d.altura),
        imc: Number(d.imc)
      }));
      setEntries(formatted.reverse()); // mostra os mais recentes primeiro
    } catch (err) {
      console.error('Erro ao buscar dados da planilha:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Função para enviar dados para a planilha (POST)
  const sendToSheet = async (data) => {
    try {
      // CORREÇÃO: Chama o URL do GAS diretamente (o doPost é acionado por POST na URL base)
      const res = await fetch(GAS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      await res.json();
    } catch (err) {
      console.error('Erro ao enviar dados para Google Sheets:', err);
    }
  };

  useEffect(() => { fetchSheetData(); }, []);

  const onSubmit = async (d) => {
    const imc = calcIMC(d.peso, d.altura);
    // O ID é o timestamp para garantir unicidade e ordenação
    const entry = { id: Date.now(), ...d, imc, categoria: imcCategoria(imc), risco: riskGroup({ ...d, imc }) };
    
    // Envia para Google Sheets
    await sendToSheet(entry);

    // Atualiza dados da planilha
    await fetchSheetData();

    reset();
    setSuccessMessage(true);
    setTimeout(() => setSuccessMessage(false), 3000);
  };

  // Cálculos de Dados (useMemo)
  const imcBySexo = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.sexo]) map[e.sexo] = { sexo: e.sexo, sum: 0, c: 0 };
      map[e.sexo].sum += e.imc;
      map[e.sexo].c++;
    });
    return Object.values(map).map(m => ({ sexo: m.sexo, avgImc: (m.sum / m.c).toFixed(2) }));
  }, [entries]);

  const riskDistribution = useMemo(() => {
    const r = { Alto: 0, Moderado: 0, Baixo: 0 };
    entries.forEach(e => r[e.risco]++);
    return Object.entries(r).map(([n, v]) => ({ name: n, value: v }));
  }, [entries]);

  const ageImcScatter = useMemo(() => entries.map(e => ({ idade: e.idade, imc: e.imc, diabetes: e.diabetes })), [entries]);

  return (
    // app-bg
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 font-inter">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`
        /* Custom styles for charts to ensure readability */
        .recharts-wrapper {
          font-size: 12px;
        }
      `}</style>
      
      {/* main-card */}
      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: "spring", stiffness: 100 }} 
        className="w-full max-w-4xl bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-8"
      >
        {/* header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            Painel de Saúde IMC 
            <span className="bg-teal-100 text-teal-800 text-xs font-semibold px-2 py-0.5 rounded-full ml-2">Análise</span>
          </h1>
          {/* button-group */}
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <button 
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${view === 'form' ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`} 
              onClick={() => setView('form')}
            >
              <CheckCircle size={18} /> Registrar
            </button>
            <button 
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${view === 'charts' ? 'bg-teal-600 text-white shadow-md hover:bg-teal-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`} 
              onClick={() => setView('charts')}
            >
              <BarChartIcon size={18} /> Análise
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'form' && (
            // form-section
            <motion.div key="form" className="space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <h2 className="text-xl font-semibold text-gray-700">Insira os Dados de Saúde</h2>
              {/* grid-form */}
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <FormField label="Idade (anos)" id="idade" errors={errors.idade}>
                  <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('idade', { required: true, min: 1, max: 120, valueAsNumber: true })} />
                </FormField>

                <FormField label="Sexo" id="sexo">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('sexo', { required: true })}>
                    <option>Masculino</option>
                    <option>Feminino</option>
                    <option>Outro</option>
                  </select>
                </FormField>

                <FormField label="Peso (kg)" id="peso" errors={errors.peso}>
                  <input type="number" step="0.1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('peso', { required: true, min: 20, max: 300, valueAsNumber: true })} />
                </FormField>

                <FormField label="Altura (m)" id="altura" errors={errors.altura}>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('altura', { required: true, min: 0.5, max: 2.5, valueAsNumber: true })} />
                </FormField>

                <FormField label="Diabetes" id="diabetes">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('diabetes', { required: true })}><option>Não</option><option>Sim</option></select>
                </FormField>

                <FormField label="Hipertensão" id="hipertensao">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('hipertensao', { required: true })}><option>Não</option><option>Sim</option></select>
                </FormField>

                <FormField label="Hábitos" id="habitos" tooltip="Nível de atividade física e dieta: Saudável, Moderado ou Ruim.">
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition duration-150" {...register('habitos', { required: true })}>
                    <option>Saudável</option>
                    <option>Moderado</option>
                    <option>Ruim</option>
                  </select>
                </FormField>
                
                {/* Placeholder para preencher a grade */}
                <div></div>

                {/* form-buttons */}
                <div className="sm:col-span-2 flex justify-end space-x-4 pt-4">
                  <button type="button" className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-150 shadow-sm" onClick={() => reset()}>Limpar</button>
                  <button type="submit" className="px-6 py-2 bg-teal-600 text-white rounded-lg shadow-md hover:bg-teal-700 transition duration-150">Salvar</button>
                </div>

                <AnimatePresence>
                  {successMessage && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }} 
                      className="sm:col-span-2 flex items-center space-x-2 p-3 bg-green-100 text-green-700 rounded-lg font-medium"
                    >
                      <CheckCircle size={18} /> Dados salvos e planilha atualizada com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          )}

          {view === 'charts' && (
            // charts-section
            <motion.div key="charts" className="space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <h2 className="text-xl font-semibold text-gray-700">Análise de Dados de Saúde</h2>

                {loading ? (
                    <div className="flex justify-center items-center h-40 text-lg text-gray-500">
                        Carregando dados...
                    </div>
                ) : (
                    <>
                        {/* stats-card */}
                        <div className="bg-teal-50 p-6 rounded-xl shadow-inner border-l-4 border-teal-600">
                            <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                            <h3 className="text-3xl font-bold text-teal-800">{entries.length}</h3>
                        </div>

                        {entries.length === 0 ? (
                             <div className="text-center p-10 bg-gray-100 rounded-xl text-gray-500">
                                Nenhum dado encontrado. Por favor, registre algumas entradas na aba "Registrar".
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* chart-card 1 */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">IMC Médio por Gênero</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={imcBySexo} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                            <XAxis dataKey="sexo" stroke={SECONDARY_COLOR} />
                                            <YAxis />
                                            <Tooltip formatter={(value) => [`${value} kg/m²`, 'IMC Médio']} />
                                            <Bar dataKey="avgImc" fill={PRIMARY_ACCENT} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* chart-card 2 */}
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">Distribuição de Risco</h3>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie 
                                                data={riskDistribution} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                outerRadius={90} 
                                                innerRadius={40}
                                                paddingAngle={5}
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {riskDistribution.map((e, i) => (
                                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                            <Tooltip formatter={(value, name) => [value, name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* chart-card full */}
                                <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-700 mb-2">Dispersão: Idade x IMC (com Diabetes)</h3>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <XAxis type="number" dataKey="idade" name="Idade (anos)" stroke={SECONDARY_COLOR} />
                                            <YAxis type="number" dataKey="imc" name="IMC (kg/m²)" stroke={SECONDARY_COLOR} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Legend />
                                            <Scatter name="Sem diabetes" data={ageImcScatter.filter(p => p.diabetes === 'Não')} fill="#198754" opacity={0.75} />
                                            <Scatter name="Com diabetes" data={ageImcScatter.filter(p => p.diabetes === 'Sim')} fill="#dc3545" opacity={0.9} />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
