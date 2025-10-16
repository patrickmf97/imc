import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, BarChart as BarChartIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import './index.css';

// 1. IMPORTAÇÕES DO FIREBASE
import { db, imcCollection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from './firebase'; // Importa a referência da coleção e as funções

const COLORS = ['#dc3545', '#ffc107', '#198754'];
const PRIMARY_ACCENT = '#00897B';

// const SHEET_URL = 'https://imc-nine-delta.vercel.app/api/sendToSheet'; // Removido ou Ignorado

const FormField = ({ label, id, children, errors, tooltip = '' }) => (
  <div className="form-field">
    <div className="form-label-container">
      <label htmlFor={id} className="form-label">{label}</label>
      {tooltip && (
        <span className="tooltip-icon" title={tooltip}>
          <Info size={16} />
        </span>
      )}
    </div>
    {children}
    {errors && <small className="error-text">Preenchimento obrigatório.</small>}
  </div>
);

export default function App() {
  const [successMessage, setSuccessMessage] = useState(false);
  const [view, setView] = useState('form');
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { sexo: 'Masculino', idade: 25, peso: 70, altura: 1.75, diabetes: 'Não', hipertensao: 'Não', habitos: 'Moderado' }
  });

  // 2. Estado inicial vazio, pois os dados virão do Firebase
  const [entries, setEntries] = useState([]);

  const calcIMC = (p, a) => Number((p / (a * a)).toFixed(2));
  const imcCategoria = i => i < 18.5 ? 'Abaixo do peso' : i < 25 ? 'Normal' : i < 30 ? 'Sobrepeso' : 'Obesidade';
  const riskGroup = ({ idade, imc, diabetes, hipertensao, habitos }) => {
    let s = 0;
    if (idade >= 60) s += 3; else if (idade >= 45) s += 2; else if (idade >= 30) s += 1;
    if (imc >= 30) s += 3; else if (imc >= 25) s += 1;
    if (diabetes === 'Sim') s += 3; if (hipertensao === 'Sim') s += 2; if (habitos === 'Ruim') s += 2; if (habitos === 'Saudável') s -= 1;
    return s >= 6 ? 'Alto' : s >= 3 ? 'Moderado' : 'Baixo';
  };

  // 4. FUNÇÃO DE SALVAMENTO NO FIRESTORE
  const saveEntryToFirestore = async (data) => {
    try {
      await addDoc(imcCollection, {
        ...data,
        createdAt: serverTimestamp(), // Adiciona um timestamp para ordenação
      });
      // A atualização do estado 'entries' será feita pelo 'onSnapshot' no useEffect
    } catch (err) {
      console.error('Erro ao salvar dados no Firestore:', err);
    }
  };

  const onSubmit = d => {
    const imc = calcIMC(d.peso, d.altura);
    const entry = { ...d, imc, categoria: imcCategoria(imc), risco: riskGroup({ ...d, imc }) };
    
    reset();
    setSuccessMessage(true);
    setTimeout(() => setSuccessMessage(false), 3000);

    // Envia para o Firestore
    saveEntryToFirestore(entry);
  };
  
  // 5. LISTENER DE DADOS EM TEMPO REAL (onSnapshot)
  useEffect(() => {
    const q = query(imcCollection, orderBy('createdAt', 'desc')); // Ordena por data de criação

    // onSnapshot cria uma conexão em tempo real.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Converte o timestamp para um formato JS ou ignora, dependendo da necessidade
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null
      })).slice(0, 5000); // Limita a 5000 registros para evitar sobrecarga
      
      setEntries(fetchedEntries);
    }, (error) => {
      console.error("Erro ao escutar o Firestore:", error);
    });

    // Retorna a função de limpeza (cleanup)
    return () => unsubscribe();
  }, []); // Executa apenas na montagem

  // Funções de Cálculo (Mantidas)
  // ... imcBySexo, riskDistribution, ageImcScatter (não requerem alterações se 'entries' for a fonte)

  const exportExcel = (entries) => {
    const ws = XLSX.utils.json_to_sheet(entries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IMC");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "dados_imc.xlsx");
  };

  const imcBySexo = useMemo(() => {
    const map = {};
    entries.forEach(e => { if (!map[e.sexo]) map[e.sexo] = { sexo: e.sexo, sum: 0, c: 0 }; map[e.sexo].sum += e.imc; map[e.sexo].c++; });
    return Object.values(map).map(m => ({ sexo: m.sexo, avgImc: (m.sum / m.c).toFixed(2) }));
  }, [entries]);

  const riskDistribution = useMemo(() => {
    const r = { Alto: 0, Moderado: 0, Baixo: 0 };
    entries.forEach(e => r[e.risco]++);
    return Object.entries(r).map(([n, v]) => ({ name: n, value: v }));
  }, [entries]);

  const ageImcScatter = useMemo(() => entries.map(e => ({ idade: e.idade, imc: e.imc, diabetes: e.diabetes })), [entries]);


  return (
    // ... restante do código (mantido)
    <div className="app-bg">
      <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 100 }}
        className="main-card">
        <header className="header">
          <h1>Painel de Saúde IMC <span className="badge">Análise</span></h1>
          <div className="button-group">
            <button className={`tab-button ${view === 'form' ? 'active' : ''}`} onClick={() => setView('form')}>
              <CheckCircle size={18} /> Registrar
            </button>
            <button className={`tab-button ${view === 'charts' ? 'active' : ''}`} onClick={() => setView('charts')}>
              <BarChartIcon size={18} /> Análise
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'form' && (
            <motion.div key="form" className="form-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              <h2>Insira os Dados</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="grid-form">
                <FormField label="Idade (anos)" id="idade" errors={errors.idade}>
                  <input type="number" {...register('idade', { required: true, min: 1, max: 120 })} />
                </FormField>
                <FormField label="Sexo" id="sexo">
                  <select {...register('sexo', { required: true })}>
                    <option>Masculino</option><option>Feminino</option><option>Outro</option>
                  </select>
                </FormField>
                <FormField label="Peso (kg)" id="peso" errors={errors.peso}>
                  <input type="number" step="0.1" {...register('peso', { required: true, min: 20, max: 300 })} />
                </FormField>
                <FormField label="Altura (m)" id="altura" errors={errors.altura}>
                  <input type="number" step="0.01" {...register('altura', { required: true, min: 0.5, max: 2.5 })} />
                </FormField>
                <FormField label="Diabetes" id="diabetes">
                  <select {...register('diabetes', { required: true })}><option>Não</option><option>Sim</option></select>
                </FormField>
                <FormField label="Hipertensão" id="hipertensao">
                  <select {...register('hipertensao', { required: true })}><option>Não</option><option>Sim</option></select>
                </FormField>
                <FormField label="Hábitos" id="habitos">
                  <select {...register('habitos', { required: true })}>
                    <option>Saudável</option><option>Moderado</option><option>Ruim</option>
                  </select>
                </FormField>

                <div className="form-buttons">
                  <button type="submit" className="btn-primary">Salvar</button>
                  <button type="button" className="btn-secondary" onClick={() => reset()}>Limpar</button>
                  <button type="button" className="btn-export" onClick={() => exportExcel(entries)}>Exportar XLS</button>
                </div>

                <AnimatePresence>
                  {successMessage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="alert-success">
                      <CheckCircle size={18} /> Dados salvos com sucesso!
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          )}

          {view === 'charts' && (
            <motion.div key="charts" className="charts-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="stats-card">
                <p>Total de Registros</p>
                <h3>{entries.length}</h3>
              </div>

              <div className="chart-grid">
                <div className="chart-card">
                  <h3>IMC Médio por Gênero</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={imcBySexo}>
                      <XAxis dataKey="sexo" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgImc" fill={PRIMARY_ACCENT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Distribuição de Risco</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={riskDistribution} dataKey="value" nameKey="name" outerRadius={90} labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {riskDistribution.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card full">
                  <h3>Idade x IMC (Scatter)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart>
                      <XAxis type="number" dataKey="idade" name="Idade" />
                      <YAxis type="number" dataKey="imc" name="IMC" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Diabetes" data={ageImcScatter} fill={PRIMARY_ACCENT} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}