// VoiceBudgetApp.js - 圖表收入/支出分線版 + 時間排序 + UI 完整整合
import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const getCategoryColor = (category) => {
  const map = {
    '飲食': '#4CAF50', '交通': '#2196F3', '娛樂': '#9C27B0',
    '購物': '#FF9800', '其他': '#9E9E9E'
  };
  return map[category] || '#000';
};

const VoiceBudgetApp = () => {
  const mediaRecorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [response, setResponse] = useState(null);
  const [records, setRecords] = useState([]);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      uploadAudio(blob);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const uploadAudio = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice.webm');
    const res = await axios.post('http://192.168.88.178:8080/api/upload', formData);
    setResponse(res.data);
    fetchRecords();
  };

  const fetchRecords = async () => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    if (day) params.day = day;
    const res = await axios.get('http://192.168.88.178:8080/api/records/summary', { params });
    setRecords(res.data.records || []);
    setIncome(res.data.income || 0);
    setExpense(res.data.expense || 0);
    setTotal(res.data.total || 0);
  };

  const saveEdit = async (id) => {
    try {
      const fullTime = new Date(`${editData.time}T12:00`).toISOString();
      await axios.put(`http://192.168.88.178:8080/api/records/${id}`, {
        ...editData,
        time: fullTime
      });
      setEditing(null);
      fetchRecords();
    } catch (err) {
      alert("❌ 修改失敗，請確認時間格式或內容");
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm('確定要刪除這筆記錄嗎？')) {
      await axios.delete(`http://192.168.88.178:8080/api/records/${id}`);
      fetchRecords();
    }
  };

  const handleEdit = (record) => {
    setEditing(record.id);
    setEditData({ ...record, time: record.time.substring(0, 10) });
  };

  const handleChange = (key, value) => {
    setEditData({ ...editData, [key]: value });
  };

  const formatTime = (iso) => new Date(iso).toLocaleString('zh-TW');

  const chartData = records.reduce((acc, r) => {
    const entry = acc.find(e => e.name === r.category);
    if (entry) entry.value += r.amount;
    else acc.push({ name: r.category, value: r.amount });
    return acc;
  }, []);

  const getLineChartData = () => {
    const map = {};
    records.forEach(r => {
      const date = r.time.substring(0, 10);
      if (!map[date]) map[date] = { date, 收入: 0, 支出: 0 };
      map[date][r.type] += r.amount;
    });
    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div style={{ padding: 30, maxWidth: 1000, margin: 'auto', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🎤 語音記帳系統</h2>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          style={{
            padding: '12px 24px',
            background: recording ? '#F44336' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 18
          }}
        >
          {recording ? "錄音中..." : "🎙 按住錄音"}
        </button>
      </div>

      <hr />
      <h3>📊 查詢與圖表</h3>
      <div style={{ marginBottom: 10 }}>
        年：
        <select value={year} onChange={e => setYear(e.target.value)}>
          <option value="">全部</option>
          {[2023, 2024, 2025].map(y => <option key={y}>{y}</option>)}
        </select>
        月：
        <select value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">全部</option>
          {[...Array(12)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
        </select>
        日：
        <select value={day} onChange={e => setDay(e.target.value)}>
          <option value="">全部</option>
          {[...Array(31)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
        </select>
        <button onClick={fetchRecords} style={{ marginLeft: 10 }}>查詢</button>
      </div>

      <p>💰 收入：{income} 元 | 🧾 支出：{expense} 元 | 💵 淨額：{total} 元</p>

      <div style={{ display: 'flex', gap: 50, marginBottom: 20 }}>
        <PieChart width={400} height={300}>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getCategoryColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>

        <LineChart width={500} height={300} data={getLineChartData()}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="收入" stroke="#00C49F" />
          <Line type="monotone" dataKey="支出" stroke="#FF8042" />
        </LineChart>
      </div>

      <h3>📋 記錄清單</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {records.map(r => (
          <li key={r.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: 10, borderRadius: 8 }}>
            {editing === r.id ? (
              <>
                <input value={editData.description} onChange={e => handleChange("description", e.target.value)} />
                <input value={editData.amount} onChange={e => handleChange("amount", e.target.value)} />
                <select value={editData.category} onChange={e => handleChange("category", e.target.value)}>
                  {['飲食', '交通', '娛樂', '購物', '其他'].map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={editData.type} onChange={e => handleChange("type", e.target.value)}>
                  <option>支出</option>
                  <option>收入</option>
                </select>
                <input type="date" value={editData.time} onChange={e => handleChange("time", e.target.value)} />
                <button onClick={() => saveEdit(r.id)}>💾 儲存</button>
              </>
            ) : (
              <>
                <p><b>{r.description}</b> - {r.amount} 元 - {r.category} - {r.type} - {formatTime(r.time)}</p>
                <button onClick={() => handleEdit(r)}>✏️ 編輯</button>
                <button onClick={() => deleteRecord(r.id)}>🗑 刪除</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VoiceBudgetApp;