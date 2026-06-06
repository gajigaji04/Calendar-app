'use client';
import { useState, useEffect, useCallback } from 'react';

/* ── 공통 스타일 ─────────────────────────────────────────────── */
const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 };
const inp  = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.92rem', width: '100%', boxSizing: 'border-box', outline: 'none' };
const row  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' };
const fmt  = n => isNaN(n) || !isFinite(n) ? '오류' : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const fmtW = n => `${fmt(n)} 원`;
const Label = ({ children }) => <span style={{ fontSize: '0.83rem', color: 'var(--text-sub)' }}>{children}</span>;
const Value = ({ children, highlight }) => (
  <span style={{ fontWeight: highlight ? 800 : 600, fontSize: highlight ? '1rem' : '0.9rem', color: highlight ? 'var(--indigo-600,#4f46e5)' : 'var(--text)' }}>{children}</span>
);

/* ── 공학용 계산기 ───────────────────────────────────────────── */
const SCI_ROWS = [
  ['sin','cos','tan','(',')','C','⌫'],
  ['asin','acos','atan','x²','√','log','ln'],
  ['π','e','%','x^y','1/x','|x|','EXP'],
  ['7','8','9','÷','MC','MR','M+'],
  ['4','5','6','×','7','8','9'],
  ['1','2','3','-','4','5','6'],
  ['0','.','±','+','1','2','3'],
  ['=','=','=','=','0','.','='],
];

const SCI_BTN_ROWS = [
  ['sin','cos','tan','(',')',  'C',   '⌫' ],
  ['asin','acos','atan','x²', '√',  'log', 'ln' ],
  ['π',   'e',   '%',  'x^y','1/x','|x|', 'EXP'],
  ['7',   '8',   '9',  '÷',  'MC', 'MR',  'M+' ],
  ['4',   '5',   '6',  '×',  null, null,  null ],
  ['1',   '2',   '3',  '-',  null, null,  null ],
  ['0',   '.',   '±',  '+',  null, null,  null ],
  [null,  null, null,  '=',  null, null,  null ],
];

function ScientificCalc() {
  const [disp,      setDisp]      = useState('0');
  const [expr,      setExpr]      = useState('');
  const [prevOp,    setPrevOp]    = useState(null);
  const [prevNum,   setPrevNum]   = useState(null);
  const [clearNext, setClearNext] = useState(false);
  const [mem,       setMem]       = useState(0);
  const [deg,       setDeg]       = useState(true);  // DEG vs RAD

  const fmtDisp = n => {
    if (!isFinite(n) || isNaN(n)) return 'Error';
    const s = parseFloat(n.toPrecision(12)).toString();
    return s.length > 14 ? n.toExponential(6) : s;
  };

  const inputDigit = useCallback(d => {
    setDisp(prev => {
      if (clearNext) { setClearNext(false); return d === '.' ? '0.' : d; }
      if (prev === '0' && d !== '.') return d;
      if (d === '.' && prev.includes('.')) return prev;
      return prev + d;
    });
  }, [clearNext]);

  const applyOp = useCallback(op => {
    const cur = parseFloat(disp);
    if (prevNum !== null && prevOp && !clearNext) {
      const res = compute(prevNum, cur, prevOp);
      setDisp(fmtDisp(res));
      setPrevNum(res);
      setExpr(`${fmtDisp(res)} ${op}`);
    } else {
      setPrevNum(cur);
      setExpr(`${disp} ${op}`);
    }
    setPrevOp(op);
    setClearNext(true);
  }, [disp, prevNum, prevOp, clearNext]);

  const compute = (a, b, op) => {
    switch (op) {
      case '+':   return a + b;
      case '-':   return a - b;
      case '×':   return a * b;
      case '÷':   return b !== 0 ? a / b : NaN;
      case 'x^y': return Math.pow(a, b);
      default:    return b;
    }
  };

  const equals = useCallback(() => {
    if (prevNum === null || !prevOp) return;
    const res = compute(prevNum, parseFloat(disp), prevOp);
    setDisp(fmtDisp(res)); setExpr(''); setPrevOp(null); setPrevNum(null); setClearNext(true);
  }, [prevNum, prevOp, disp]);

  const sciFunc = useCallback(fn => {
    const v = parseFloat(disp);
    const toRad = x => deg ? x * Math.PI / 180 : x;
    const toDeg = x => deg ? x * 180 / Math.PI : x;
    const map = {
      'sin': Math.sin(toRad(v)), 'cos': Math.cos(toRad(v)), 'tan': Math.tan(toRad(v)),
      'asin': toDeg(Math.asin(v)), 'acos': toDeg(Math.acos(v)), 'atan': toDeg(Math.atan(v)),
      'log': Math.log10(v), 'ln': Math.log(v),
      '√': Math.sqrt(v), 'x²': v * v, '1/x': 1 / v, '|x|': Math.abs(v),
      '%': v / 100, 'EXP': v * Math.pow(10, 1), '±': -v,
      'π': Math.PI, 'e': Math.E,
    };
    if (fn === 'π' || fn === 'e') { setDisp(fmtDisp(map[fn])); setClearNext(true); return; }
    if (fn in map) { setDisp(fmtDisp(map[fn])); setClearNext(true); }
  }, [disp, deg]);

  const handleBtn = useCallback(btn => {
    if (btn === null) return;
    if ('0123456789.'.includes(btn)) { inputDigit(btn); return; }
    if (['+','-','×','÷','x^y'].includes(btn)) { applyOp(btn); return; }
    if (btn === '=')  { equals(); return; }
    if (btn === 'C')  { setDisp('0'); setExpr(''); setPrevOp(null); setPrevNum(null); setClearNext(false); return; }
    if (btn === '⌫')  { setDisp(p => p.length > 1 ? p.slice(0,-1) : '0'); return; }
    if (btn === 'MC') { setMem(0); return; }
    if (btn === 'MR') { setDisp(fmtDisp(mem)); setClearNext(true); return; }
    if (btn === 'M+') { setMem(m => m + parseFloat(disp)); return; }
    if (btn === '(' || btn === ')') { setExpr(p => p + btn); return; }
    sciFunc(btn);
  }, [inputDigit, applyOp, equals, sciFunc, disp, mem]);

  useEffect(() => {
    const onKey = e => {
      if (e.key >= '0' && e.key <= '9') handleBtn(e.key);
      else if (e.key === '.')  handleBtn('.');
      else if (e.key === '+')  handleBtn('+');
      else if (e.key === '-')  handleBtn('-');
      else if (e.key === '*')  handleBtn('×');
      else if (e.key === '/')  { e.preventDefault(); handleBtn('÷'); }
      else if (e.key === 'Enter' || e.key === '=') handleBtn('=');
      else if (e.key === 'Backspace') handleBtn('⌫');
      else if (e.key === 'Escape')    handleBtn('C');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBtn]);

  const BTN_ROWS = [
    ['sin','cos','tan','(',')',  'C',   '⌫' ],
    ['asin','acos','atan','x²','√','log','ln'],
    ['π',  'e',   '%',  'x^y','1/x','|x|','EXP'],
    ['7',  '8',   '9',  '÷',  'MC', 'MR', 'M+'],
    ['4',  '5',   '6',  '×'],
    ['1',  '2',   '3',  '-'],
    ['0',  '.',   '±',  '+'],
    [null, null,  null, '='],
  ];

  const btnColor = b => {
    if (b === '=' )   return { background: 'var(--indigo-600,#4f46e5)', color: '#fff' };
    if (b === 'C' || b === '⌫') return { background: 'rgba(239,68,68,.12)', color: '#ef4444' };
    if (['+','-','×','÷','x^y'].includes(b)) return { background: 'rgba(99,102,241,.12)', color: 'var(--indigo-600,#4f46e5)' };
    if ('0123456789.'.includes(b)) return { background: 'var(--bg)' };
    return { background: 'var(--border-lt,#f1f5f9)', color: 'var(--text-sub)', fontSize: '0.72rem' };
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto' }}>
      {/* 디스플레이 */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', minHeight: 16, textAlign: 'right' }}>
          {expr} <button onClick={() => setDeg(d => !d)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--indigo-600,#4f46e5)', fontWeight: 700, padding: '0 0 0 8px', fontFamily: 'inherit' }}>{deg ? 'DEG' : 'RAD'}</button>
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)', overflowX: 'auto', whiteSpace: 'nowrap' }}>{disp}</div>
        {mem !== 0 && <div style={{ fontSize: '0.68rem', color: 'var(--indigo-600,#4f46e5)', textAlign: 'right' }}>M: {fmtDisp(mem)}</div>}
      </div>

      {/* 버튼 그리드 */}
      {BTN_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.filter(Boolean).length || 4},1fr)`, gap: 6, marginBottom: 6 }}>
          {row.map((b, bi) => b === null ? null : (
            <button key={bi} onClick={() => handleBtn(b)}
              style={{
                ...btnColor(b), border: '1px solid var(--border)', borderRadius: 9,
                padding: b === '=' ? '22px 0' : '13px 0',
                fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'opacity .1s',
                gridRow: b === '=' && ri === 7 ? 'span 2' : undefined,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.75'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >{b}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── 연봉 계산기 ─────────────────────────────────────────────── */
function workDeduction(y) {
  if (y <= 5_000_000)   return y * 0.70;
  if (y <= 15_000_000)  return 3_500_000 + (y - 5_000_000) * 0.40;
  if (y <= 45_000_000)  return 7_500_000 + (y - 15_000_000) * 0.15;
  if (y <= 100_000_000) return 12_000_000 + (y - 45_000_000) * 0.05;
  return 24_750_000;
}
function incomeTax(t) {
  if (t <= 14_000_000)   return t * 0.06;
  if (t <= 50_000_000)   return 840_000   + (t - 14_000_000)  * 0.15;
  if (t <= 88_000_000)   return 6_240_000 + (t - 50_000_000)  * 0.24;
  if (t <= 150_000_000)  return 15_360_000 + (t - 88_000_000) * 0.35;
  if (t <= 300_000_000)  return 37_060_000 + (t - 150_000_000)* 0.38;
  if (t <= 500_000_000)  return 94_060_000 + (t - 300_000_000)* 0.40;
  if (t <= 1_000_000_000)return 174_060_000+ (t - 500_000_000)* 0.42;
  return 384_060_000 + (t - 1_000_000_000) * 0.45;
}
function earnCredit(tax, salary) {
  const credit = tax <= 1_300_000 ? tax * 0.55 : 715_000 + (tax - 1_300_000) * 0.30;
  const lim = salary <= 33_000_000 ? 740_000 : salary <= 70_000_000 ? 660_000 : 500_000;
  return Math.min(credit, lim);
}

function SalaryCalc() {
  const [salary,  setSalary]  = useState('');
  const [deps,    setDeps]    = useState(0);
  const [result,  setResult]  = useState(null);

  const calc = () => {
    const 연봉 = parseInt(salary.replace(/,/g, '')) || 0;
    if (연봉 <= 0) return;
    const 월급여 = Math.round(연봉 / 12);

    // 4대보험
    const 국민연금기준  = Math.min(Math.max(월급여, 370_000), 5_900_000);
    const 국민연금       = Math.floor(국민연금기준 * 0.045 / 10) * 10;
    const 건강보험       = Math.floor(월급여 * 0.03545 / 10) * 10;
    const 장기요양       = Math.floor(건강보험 * 0.1295 / 10) * 10;
    const 고용보험       = Math.floor(월급여 * 0.009  / 10) * 10;

    // 소득세
    const deduct  = workDeduction(연봉);
    const income  = Math.max(0, 연봉 - deduct);
    const persDed = (1 + Math.max(0, parseInt(deps) || 0)) * 1_500_000;
    const insDed  = (국민연금 + 건강보험 + 장기요양) * 12;
    const taxBase = Math.max(0, income - persDed - insDed - 130_000);
    const annTax  = Math.max(0, incomeTax(taxBase) - earnCredit(incomeTax(taxBase), 연봉));
    const 월소득세 = Math.floor(annTax / 12 / 10) * 10;
    const 지방소득세 = Math.floor(월소득세 * 0.1 / 10) * 10;

    const 총공제  = 국민연금 + 건강보험 + 장기요양 + 고용보험 + 월소득세 + 지방소득세;
    const 실수령액 = 월급여 - 총공제;
    setResult({ 월급여, 국민연금, 건강보험, 장기요양, 고용보험, 월소득세, 지방소득세, 총공제, 실수령액 });
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>연봉 (원)</div>
            <input value={salary} onChange={e => setSalary(e.target.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,','))}
              placeholder="예) 40,000,000" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>부양가족 수 (본인 제외)</div>
            <input type="number" min="0" max="10" value={deps} onChange={e => setDeps(e.target.value)} style={{ ...inp, width: 100 }} />
          </div>
          <button onClick={calc} style={{ background: 'var(--indigo-600,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            계산하기
          </button>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text)' }}>월 급여 명세 (2024 기준 근사치)</div>
          {[
            ['월 세전 급여', fmtW(result.월급여)],
            ['국민연금 (4.5%)', `- ${fmtW(result.국민연금)}`],
            ['건강보험 (3.545%)', `- ${fmtW(result.건강보험)}`],
            ['장기요양보험', `- ${fmtW(result.장기요양)}`],
            ['고용보험 (0.9%)', `- ${fmtW(result.고용보험)}`],
            ['소득세', `- ${fmtW(result.월소득세)}`],
            ['지방소득세', `- ${fmtW(result.지방소득세)}`],
            ['총 공제액', `- ${fmtW(result.총공제)}`],
          ].map(([l, v]) => (
            <div key={l} style={row}>
              <Label>{l}</Label>
              <Value>{v}</Value>
            </div>
          ))}
          <div style={{ ...row, borderBottom: 'none', paddingTop: 12 }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>월 실수령액</span>
            <Value highlight>{fmtW(result.실수령액)}</Value>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 10 }}>* 간이세액표 기반 근사치입니다. 실제 금액은 다를 수 있습니다.</div>
        </div>
      )}
    </div>
  );
}

/* ── 대출 계산기 ─────────────────────────────────────────────── */
function LoanCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate,      setRate]      = useState('');
  const [months,    setMonths]    = useState('');
  const [method,    setMethod]    = useState('equal');  // equal=원리금균등, principal=원금균등
  const [result,    setResult]    = useState(null);

  const calc = () => {
    const P = parseInt(principal.replace(/,/g,'')) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = parseInt(months) || 0;
    if (P <= 0 || r <= 0 || n <= 0) return;

    if (method === 'equal') {
      // 원리금균등상환
      const monthly = P * r * Math.pow(1+r,n) / (Math.pow(1+r,n) - 1);
      const total   = monthly * n;
      const interest = total - P;
      setResult({ type: '원리금균등', monthly: Math.round(monthly), total: Math.round(total), interest: Math.round(interest), firstMonth: Math.round(monthly) });
    } else {
      // 원금균등상환
      const principalMonthly = P / n;
      const firstInterest    = P * r;
      const firstMonth       = principalMonthly + firstInterest;
      // 총이자 = P × r × (n+1) / 2
      const interest = P * r * (n + 1) / 2;
      const total    = P + interest;
      setResult({ type: '원금균등', monthly: Math.round(principalMonthly), total: Math.round(total), interest: Math.round(interest), firstMonth: Math.round(firstMonth) });
    }
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>대출금액 (원)</div>
            <input value={principal} onChange={e => setPrincipal(e.target.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,','))}
              placeholder="예) 100,000,000" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>연이율 (%)</div>
              <input value={rate} onChange={e => setRate(e.target.value)} placeholder="예) 4.5" style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>대출기간 (개월)</div>
              <input value={months} onChange={e => setMonths(e.target.value.replace(/[^0-9]/g,''))} placeholder="예) 360" style={inp} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 6 }}>상환 방식</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['equal','원리금균등'], ['principal','원금균등']].map(([v,l]) => (
                <button key={v} onClick={() => setMethod(v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 9, border: '1px solid var(--border)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer',
                  background: method === v ? 'var(--indigo-600,#4f46e5)' : 'var(--bg)',
                  color:      method === v ? '#fff' : 'var(--text)',
                }}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={calc} style={{ background: 'var(--indigo-600,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            계산하기
          </button>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text)' }}>{result.type} 결과</div>
          {[
            [result.type === '원리금균등' ? '월 납입금 (균등)' : '월 원금 상환분', fmtW(result.monthly)],
            ['첫 달 납입금', fmtW(result.firstMonth)],
            ['총 납입금', fmtW(result.total)],
            ['총 이자', fmtW(result.interest)],
          ].map(([l, v]) => (
            <div key={l} style={row}>
              <Label>{l}</Label>
              <Value>{v}</Value>
            </div>
          ))}
          <div style={{ ...row, borderBottom: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>총 이자 비율</span>
            <Value highlight>{((result.interest / (parseInt(principal.replace(/,/g,''))||1)) * 100).toFixed(1)}%</Value>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 10 }}>* 중도상환·우대금리 미적용 단순 계산입니다.</div>
        </div>
      )}
    </div>
  );
}

/* ── 세금 계산기 ─────────────────────────────────────────────── */
const TAX_TABS = [
  { id: 'vat',    label: '부가가치세' },
  { id: 'acq',    label: '취득세' },
  { id: 'income', label: '종합소득세' },
];

function VatCalc() {
  const [val, setVal] = useState('');
  const [dir, setDir] = useState('to');  // to=공급가액→포함가, from=포함가→공급가액
  const supply = dir === 'to'
    ? parseInt(val.replace(/,/g,'')) || 0
    : Math.round((parseInt(val.replace(/,/g,''))||0) / 1.1);
  const vat   = Math.round(supply * 0.1);
  const total = supply + vat;

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[['to','공급가액 → 세금계산서'],['from','합계금액 → 공급가액']].map(([v,l]) => (
          <button key={v} onClick={() => { setDir(v); setVal(''); }} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            background: dir === v ? 'var(--indigo-600,#4f46e5)' : 'var(--bg)', color: dir === v ? '#fff' : 'var(--text)',
          }}>{l}</button>
        ))}
      </div>
      <input value={val} onChange={e => setVal(e.target.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,','))}
        placeholder={dir === 'to' ? '공급가액 입력' : '부가세 포함 금액 입력'} style={{ ...inp, marginBottom: 14 }} />
      {val && (
        <>
          {[['공급가액', fmtW(supply)],['부가세 (10%)', fmtW(vat)],['합계 (공급대가)', fmtW(total)]].map(([l,v],i) => (
            <div key={l} style={{ ...row, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <Label>{l}</Label>
              <Value highlight={i === 2}>{v}</Value>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function AcqTaxCalc() {
  const [price,   setPrice]   = useState('');
  const [houses,  setHouses]  = useState('1');
  const [adj,     setAdj]     = useState(false);
  const [result,  setResult]  = useState(null);

  const calc = () => {
    const p = parseInt(price.replace(/,/g,'')) || 0;
    const h = parseInt(houses) || 1;
    if (p <= 0) return;
    // 2020년 개정 취득세율
    let rate;
    if (h >= 3 || (h === 2 && adj)) rate = 0.12;
    else if (h === 2 && !adj)       rate = 0.08;
    else if (p <= 600_000_000)      rate = 0.01;
    else if (p <= 900_000_000)      rate = 0.02;
    else                            rate = 0.03;
    const acq  = Math.round(p * rate);
    const edu  = Math.round(p * 0.002);  // 지방교육세 (0.2%)
    const farm = rate <= 0.02 ? Math.round(p * 0.0002) : 0;  // 농어촌특별세
    setResult({ p, rate: (rate * 100).toFixed(0), acq, edu, farm, total: acq + edu + farm });
  };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>취득 금액 (원)</div>
          <input value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,','))}
            placeholder="예) 500,000,000" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>취득 후 보유 주택 수</div>
            <select value={houses} onChange={e => setHouses(e.target.value)} style={{ ...inp }}>
              <option value="1">1주택</option>
              <option value="2">2주택</option>
              <option value="3">3주택 이상</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', cursor: 'pointer', paddingBottom: 10 }}>
            <input type="checkbox" checked={adj} onChange={e => setAdj(e.target.checked)} />
            조정대상지역
          </label>
        </div>
        <button onClick={calc} style={{ background: 'var(--indigo-600,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
          계산하기
        </button>
      </div>
      {result && (
        <>
          {[
            [`취득세 (${result.rate}%)`, fmtW(result.acq)],
            ['지방교육세 (0.2%)', fmtW(result.edu)],
            ...(result.farm ? [['농어촌특별세 (0.02%)', fmtW(result.farm)]] : []),
          ].map(([l, v]) => (
            <div key={l} style={row}><Label>{l}</Label><Value>{v}</Value></div>
          ))}
          <div style={{ ...row, borderBottom: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>총 취득세</span>
            <Value highlight>{fmtW(result.total)}</Value>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 10 }}>* 실거래가 신고 기준. 감면·중과 조건에 따라 다를 수 있습니다.</div>
        </>
      )}
    </div>
  );
}

function IncomeTaxCalc() {
  const [income, setIncome] = useState('');
  const [result, setResult] = useState(null);

  const calc = () => {
    const y = parseInt(income.replace(/,/g,'')) || 0;
    if (y <= 0) return;
    const tax  = incomeTax(y);
    const loc  = Math.round(tax * 0.1);
    let bracket = '6%';
    if (y > 1_000_000_000) bracket = '45%';
    else if (y > 500_000_000) bracket = '42%';
    else if (y > 300_000_000) bracket = '40%';
    else if (y > 150_000_000) bracket = '38%';
    else if (y > 88_000_000)  bracket = '35%';
    else if (y > 50_000_000)  bracket = '24%';
    else if (y > 14_000_000)  bracket = '15%';
    setResult({ y, tax: Math.round(tax), loc, total: Math.round(tax) + loc, bracket });
  };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>과세표준 금액 (원)</div>
      <input value={income} onChange={e => setIncome(e.target.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,','))}
        placeholder="공제 후 과세표준 입력" style={{ ...inp, marginBottom: 12 }} />
      <button onClick={calc} style={{ background: 'var(--indigo-600,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', width: '100%', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 14 }}>
        계산하기
      </button>

      {/* 세율 구간 안내 */}
      <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: 6 }}>2024 종합소득세율 구간</div>
        {[['~1,400만','6%'],['1,400~5,000만','15%'],['5,000~8,800만','24%'],['8,800만~1.5억','35%'],['1.5억~3억','38%'],['3억~5억','40%'],['5억~10억','42%'],['10억~','45%']].map(([r,t]) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '2px 0' }}>
            <span style={{ color: 'var(--text-sub)' }}>{r}</span>
            <span style={{ fontWeight: 700, color: 'var(--indigo-600,#4f46e5)' }}>{t}</span>
          </div>
        ))}
      </div>

      {result && (
        <>
          {[
            [`소득세 (최고세율 ${result.bracket})`, fmtW(result.tax)],
            ['지방소득세 (10%)', fmtW(result.loc)],
          ].map(([l,v]) => (
            <div key={l} style={row}><Label>{l}</Label><Value>{v}</Value></div>
          ))}
          <div style={{ ...row, borderBottom: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>총 납부세액</span>
            <Value highlight>{fmtW(result.total)}</Value>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 10 }}>* 소득공제 적용 전 과세표준 기준입니다.</div>
        </>
      )}
    </div>
  );
}

function TaxCalc() {
  const [sub, setSub] = useState('vat');
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--border-lt,#f1f5f9)', borderRadius: 10, padding: 4 }}>
        {TAX_TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, transition: 'all .15s',
            background: sub === t.id ? 'var(--card)' : 'transparent',
            color:      sub === t.id ? 'var(--text)' : 'var(--text-sub)',
          }}>{t.label}</button>
        ))}
      </div>
      {sub === 'vat'    && <VatCalc />}
      {sub === 'acq'    && <AcqTaxCalc />}
      {sub === 'income' && <IncomeTaxCalc />}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
const MAIN_TABS = [
  { id: 'sci',    label: '공학용',    icon: 'fa-superscript' },
  { id: 'salary', label: '연봉',      icon: 'fa-won-sign' },
  { id: 'loan',   label: '대출 이자', icon: 'fa-percent' },
  { id: 'tax',    label: '세금',      icon: 'fa-receipt' },
];

export default function CalculatorPage() {
  const [tab, setTab] = useState('sci');
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <i className="fas fa-calculator" style={{ fontSize: '1.25rem', color: 'var(--indigo-600,#4f46e5)' }} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>계산기</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--border-lt,#f1f5f9)', borderRadius: 12, padding: 4 }}>
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, transition: 'all .15s',
            background: tab === t.id ? 'var(--card)' : 'transparent',
            color:      tab === t.id ? 'var(--text)' : 'var(--text-sub)',
            boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
          }}>
            <i className={`fas ${t.icon}`} style={{ marginRight: 4 }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'sci'    && <ScientificCalc />}
      {tab === 'salary' && <SalaryCalc />}
      {tab === 'loan'   && <LoanCalc />}
      {tab === 'tax'    && <TaxCalc />}
    </div>
  );
}
