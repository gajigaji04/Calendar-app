'use client';
import { useState, useEffect, useCallback } from 'react';

/* ── 공통 ──────────────────────────────────────────────────── */
const card  = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 };
const inp   = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.92rem', width: '100%', boxSizing: 'border-box', outline: 'none' };
const rowSt = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' };
const fmt   = n => (isNaN(n) || !isFinite(n)) ? '오류' : n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const fmtW  = n => `${fmt(n)} 원`;
const cmma  = s => (s || '').replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const parse = s => parseInt((s || '').replace(/,/g, '')) || 0;
const fl10  = n => Math.floor(n / 10) * 10;

function Label({ children }) {
  return <span style={{ fontSize: '0.83rem', color: 'var(--text-sub)' }}>{children}</span>;
}
function Val({ children, hi, red }) {
  return <span style={{ fontWeight: hi ? 800 : 600, fontSize: hi ? '1rem' : '0.9rem', color: red ? '#ef4444' : hi ? 'var(--indigo-600,#4f46e5)' : 'var(--text)' }}>{children}</span>;
}
function Row({ label, value, hi, red, last }) {
  return <div style={{ ...rowSt, borderBottom: last ? 'none' : '1px solid var(--border)' }}><Label>{label}</Label><Val hi={hi} red={red}>{value}</Val></div>;
}
function Fld({ label, children, flex1 }) {
  return <div style={flex1 ? { flex: 1 } : {}}><div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 4 }}>{label}</div>{children}</div>;
}
function Seg({ opts, val, onChange, sm }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--border-lt,#f1f5f9)', borderRadius: 10, padding: 4 }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          flex: 1, padding: sm ? '5px 0' : '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: sm ? '0.75rem' : '0.8rem', fontWeight: 600, transition: 'all .15s',
          background: val === v ? 'var(--card)' : 'transparent',
          color: val === v ? 'var(--text)' : 'var(--text-sub)',
          boxShadow: val === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
        }}>{l}</button>
      ))}
    </div>
  );
}
const calcBtn = { background: 'var(--indigo-600,#4f46e5)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 0', width: '100%', fontFamily: 'inherit', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' };
const noteStyle = { fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 10, lineHeight: 1.6 };

/* ── 세금 계산 함수 ─────────────────────────────────────────── */
function workDeduction(y) {
  if (y <= 5_000_000)   return y * 0.70;
  if (y <= 15_000_000)  return 3_500_000  + (y - 5_000_000)   * 0.40;
  if (y <= 45_000_000)  return 7_500_000  + (y - 15_000_000)  * 0.15;
  if (y <= 100_000_000) return 12_000_000 + (y - 45_000_000)  * 0.05;
  return Math.min(14_750_000 + (y - 100_000_000) * 0.02, 20_000_000);
}
function incomeTaxAmt(t) {
  if (t <= 0)             return 0;
  if (t <= 14_000_000)    return t * 0.06;
  if (t <= 50_000_000)    return 840_000    + (t - 14_000_000)   * 0.15;
  if (t <= 88_000_000)    return 6_240_000  + (t - 50_000_000)   * 0.24;
  if (t <= 150_000_000)   return 15_360_000 + (t - 88_000_000)   * 0.35;
  if (t <= 300_000_000)   return 37_060_000 + (t - 150_000_000)  * 0.38;
  if (t <= 500_000_000)   return 94_060_000 + (t - 300_000_000)  * 0.40;
  if (t <= 1_000_000_000) return 174_060_000 + (t - 500_000_000) * 0.42;
  return 384_060_000 + (t - 1_000_000_000) * 0.45;
}
function earnCredit(tax, totalSalary) {
  if (tax <= 0) return 0;
  const credit = tax <= 1_300_000 ? tax * 0.55 : 715_000 + (tax - 1_300_000) * 0.30;
  const lim = totalSalary <= 33_000_000 ? 740_000 : totalSalary <= 70_000_000 ? 660_000 : 500_000;
  return Math.min(credit, lim);
}
function childTaxCredit(n) {
  if (n <= 0) return 0;
  if (n === 1) return 150_000;
  if (n === 2) return 350_000;
  return 350_000 + (n - 2) * 300_000;
}

/* ── 공학용 계산기 ─────────────────────────────────────────── */
function ScientificCalc() {
  const [disp, setDisp]           = useState('0');
  const [expr, setExpr]           = useState('');
  const [prevOp, setPrevOp]       = useState(null);
  const [prevNum, setPrevNum]     = useState(null);
  const [clearNext, setClearNext] = useState(false);
  const [mem, setMem]             = useState(0);
  const [deg, setDeg]             = useState(true);

  const fmtD = n => {
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

  const computeOp = (a, b, op) => {
    switch (op) {
      case '+': return a + b; case '-': return a - b;
      case '×': return a * b; case '÷': return b !== 0 ? a / b : NaN;
      case '^': return Math.pow(a, b); default: return b;
    }
  };

  const applyOp = useCallback(op => {
    const cur = parseFloat(disp);
    if (prevNum !== null && prevOp && !clearNext) {
      const res = computeOp(prevNum, cur, prevOp);
      setDisp(fmtD(res)); setPrevNum(res); setExpr(`${fmtD(res)} ${op}`);
    } else {
      setPrevNum(cur); setExpr(`${disp} ${op}`);
    }
    setPrevOp(op); setClearNext(true);
  }, [disp, prevNum, prevOp, clearNext]);

  const equals = useCallback(() => {
    if (prevNum === null || !prevOp) return;
    const res = computeOp(prevNum, parseFloat(disp), prevOp);
    setDisp(fmtD(res)); setExpr(''); setPrevOp(null); setPrevNum(null); setClearNext(true);
  }, [prevNum, prevOp, disp]);

  const sciFunc = useCallback(fn => {
    const v = parseFloat(disp);
    const toR = x => deg ? x * Math.PI / 180 : x;
    const toD = x => deg ? x * 180 / Math.PI : x;
    const map = {
      sin: Math.sin(toR(v)), cos: Math.cos(toR(v)), tan: Math.tan(toR(v)),
      asin: toD(Math.asin(v)), acos: toD(Math.acos(v)), atan: toD(Math.atan(v)),
      log: Math.log10(v), ln: Math.log(v),
      '√': Math.sqrt(v), 'x²': v * v, '1/x': 1 / v, '|x|': Math.abs(v),
      '%': v / 100, '±': -v, π: Math.PI, e: Math.E,
    };
    if (fn in map) { setDisp(fmtD(map[fn])); setClearNext(true); }
  }, [disp, deg]);

  const handleBtn = useCallback(b => {
    if (b === null) return;
    if ('0123456789.'.includes(b)) { inputDigit(b); return; }
    if (['+','-','×','÷','^'].includes(b)) { applyOp(b); return; }
    if (b === '=')  { equals(); return; }
    if (b === 'C')  { setDisp('0'); setExpr(''); setPrevOp(null); setPrevNum(null); setClearNext(false); return; }
    if (b === '⌫')  { setDisp(p => p.length > 1 ? p.slice(0,-1) : '0'); return; }
    if (b === 'MC') { setMem(0); return; }
    if (b === 'MR') { setDisp(fmtD(mem)); setClearNext(true); return; }
    if (b === 'M+') { setMem(m => m + parseFloat(disp)); return; }
    sciFunc(b);
  }, [inputDigit, applyOp, equals, sciFunc, disp, mem]);

  useEffect(() => {
    const h = e => {
      if (e.key >= '0' && e.key <= '9') handleBtn(e.key);
      else if (e.key === '.') handleBtn('.');
      else if (e.key === '+') handleBtn('+');
      else if (e.key === '-') handleBtn('-');
      else if (e.key === '*') handleBtn('×');
      else if (e.key === '/') { e.preventDefault(); handleBtn('÷'); }
      else if (e.key === 'Enter' || e.key === '=') handleBtn('=');
      else if (e.key === 'Backspace') handleBtn('⌫');
      else if (e.key === 'Escape') handleBtn('C');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleBtn]);

  const BTNS = [
    ['sin','cos','tan','(',')', 'C',  '⌫'],
    ['asin','acos','atan','x²','√','log','ln'],
    ['π',  'e',   '%',  '^', '1/x','|x|','±'],
    ['7',  '8',   '9',  '÷', 'MC', 'MR', 'M+'],
    ['4',  '5',   '6',  '×'],
    ['1',  '2',   '3',  '-'],
    ['0',  '.',   null, '+'],
    [null, null,  null, '='],
  ];
  const bColor = b => {
    if (b === '=') return { background: 'var(--indigo-600,#4f46e5)', color: '#fff' };
    if (b === 'C' || b === '⌫') return { background: 'rgba(239,68,68,.12)', color: '#ef4444' };
    if (['+','-','×','÷','^'].includes(b)) return { background: 'rgba(99,102,241,.12)', color: 'var(--indigo-600,#4f46e5)' };
    if ('0123456789.'.includes(b)) return { background: 'var(--bg)' };
    return { background: 'var(--border-lt,#f1f5f9)', color: 'var(--text-sub)', fontSize: '0.72rem' };
  };

  return (
    <div style={{ maxWidth: 360, margin: '0 auto' }}>
      <div style={{ ...card, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', minHeight: 16, textAlign: 'right', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ opacity: .5 }}>{expr}</span>
          <button onClick={() => setDeg(d => !d)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--indigo-600,#4f46e5)', fontWeight: 700, fontFamily: 'inherit' }}>{deg ? 'DEG' : 'RAD'}</button>
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text)', overflowX: 'auto', whiteSpace: 'nowrap' }}>{disp}</div>
        {mem !== 0 && <div style={{ fontSize: '0.68rem', color: 'var(--indigo-600,#4f46e5)', textAlign: 'right' }}>M: {fmtD(mem)}</div>}
      </div>
      {BTNS.map((row, ri) => {
        const visible = row.filter(Boolean);
        return (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: `repeat(${visible.length || 4},1fr)`, gap: 6, marginBottom: 6 }}>
            {row.map((b, bi) => b === null ? null : (
              <button key={bi} onClick={() => handleBtn(b)} style={{
                ...bColor(b), border: '1px solid var(--border)', borderRadius: 9,
                padding: b === '=' ? '22px 0' : '13px 0', fontFamily: 'inherit',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity .1s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >{b}</button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ── 급여 계산기 ──────────────────────────────────────────── */
function SalaryCalc() {
  const [mode,     setMode]     = useState('annual');
  const [amount,   setAmount]   = useState('');
  const [mealEx,   setMealEx]   = useState(true);
  const [deps,     setDeps]     = useState('1');
  const [children, setChildren] = useState('0');
  const [result,   setResult]   = useState(null);

  const calc = () => {
    const raw = parse(amount);
    if (raw <= 0) return;
    const 연봉 = mode === 'annual' ? raw : raw * 12;
    const 월급여 = Math.round(연봉 / 12);
    const 비과세월 = mealEx ? 200_000 : 0;
    const 과세월급 = Math.max(0, 월급여 - 비과세월);
    const 과세연봉 = 과세월급 * 12;

    const 국민연금기준 = Math.min(Math.max(과세월급, 370_000), 6_170_000);
    const 국민연금 = fl10(국민연금기준 * 0.045);
    const 건강보험 = fl10(과세월급 * 0.03545);
    const 장기요양 = fl10(건강보험 * 0.1295);
    const 고용보험 = fl10(과세월급 * 0.009);

    const 근로소득공제 = workDeduction(과세연봉);
    const 근로소득금액 = Math.max(0, 과세연봉 - 근로소득공제);
    const depN = Math.max(1, parseInt(deps) || 1);
    const 인적공제 = depN * 1_500_000;
    const 보험료공제 = (국민연금 + 건강보험 + 장기요양) * 12;
    const 과세표준 = Math.max(0, 근로소득금액 - 인적공제 - 보험료공제);
    const 산출세액 = incomeTaxAmt(과세표준);
    const 근로세액공제 = earnCredit(산출세액, 과세연봉);
    const 자녀공제 = childTaxCredit(parseInt(children) || 0);
    const 연소득세 = Math.max(0, 산출세액 - 근로세액공제 - 자녀공제);
    const 월소득세 = fl10(연소득세 / 12);
    const 지방소득세 = fl10(월소득세 * 0.1);
    const 총공제 = 국민연금 + 건강보험 + 장기요양 + 고용보험 + 월소득세 + 지방소득세;
    const 실수령액 = 월급여 - 총공제;

    setResult({ 연봉, 월급여, 비과세월, 과세월급, 국민연금, 건강보험, 장기요양, 고용보험, 월소득세, 지방소득세, 총공제, 실수령액 });
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Fld label="입력 방식">
            <Seg opts={[['annual','연봉 입력'],['monthly','월급 입력']]} val={mode} onChange={v => { setMode(v); setAmount(''); setResult(null); }} />
          </Fld>
          <Fld label={mode === 'annual' ? '연봉 (원)' : '월 급여 (원)'}>
            <input value={amount} onChange={e => setAmount(cmma(e.target.value))}
              placeholder={mode === 'annual' ? '예) 40,000,000' : '예) 3,500,000'} style={inp} />
          </Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="부양가족 (본인 포함)" flex1>
              <input type="number" min="1" max="20" value={deps} onChange={e => setDeps(e.target.value)} style={inp} />
            </Fld>
            <Fld label="20세 이하 자녀 수" flex1>
              <input type="number" min="0" max="10" value={children} onChange={e => setChildren(e.target.value)} style={inp} />
            </Fld>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={mealEx} onChange={e => setMealEx(e.target.checked)} />
            식대 비과세 적용 (월 20만원, 2024 기준)
          </label>
          <button onClick={calc} style={calcBtn}>계산하기</button>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: 9, padding: '10px 14px', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>세전 연봉</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmtW(result.연봉)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>연간 실수령</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--indigo-600,#4f46e5)' }}>{fmtW(result.실수령액 * 12)}</div>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 6, color: 'var(--text)' }}>월 급여 명세</div>
          <Row label="월 세전 급여" value={fmtW(result.월급여)} />
          {result.비과세월 > 0 && <Row label="비과세 식대" value={`- ${fmtW(result.비과세월)}`} />}
          {result.비과세월 > 0 && <Row label="과세 급여" value={fmtW(result.과세월급)} />}
          <Row label="국민연금 (4.5%, 상한 617만)" value={`- ${fmtW(result.국민연금)}`} />
          <Row label="건강보험 (3.545%)" value={`- ${fmtW(result.건강보험)}`} />
          <Row label="장기요양보험 (건강보험의 12.95%)" value={`- ${fmtW(result.장기요양)}`} />
          <Row label="고용보험 (0.9%)" value={`- ${fmtW(result.고용보험)}`} />
          <Row label="소득세" value={`- ${fmtW(result.월소득세)}`} />
          <Row label="지방소득세 (소득세의 10%)" value={`- ${fmtW(result.지방소득세)}`} />
          <Row label="총 공제" value={`- ${fmtW(result.총공제)}`} />
          <Row label="월 실수령액" value={fmtW(result.실수령액)} hi last />
          <div style={noteStyle}>
            * 2024 기준: 국민연금 상한 617만원, 건강보험 3.545%, 장기요양 12.95%.<br />
            * 근로소득공제·인적공제·근로소득세액공제·자녀세액공제 반영.<br />
            * 실제 금액은 회사 내규·추가 공제 항목에 따라 다릅니다.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 대출 이자 계산기 ─────────────────────────────────────── */
function LoanCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate,      setRate]      = useState('');
  const [years,     setYears]     = useState('');
  const [grace,     setGrace]     = useState('0');
  const [method,    setMethod]    = useState('equal');
  const [result,    setResult]    = useState(null);
  const [showAll,   setShowAll]   = useState(false);

  const calc = () => {
    const P = parse(principal);
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const totalM = (parseInt(years) || 0) * 12;
    const graceM = Math.min(parseInt(grace) || 0, totalM - 1);
    const repayM = totalM - graceM;
    if (P <= 0 || r <= 0 || totalM <= 0) return;

    const schedule = [];

    if (method === 'bullet') {
      for (let i = 1; i <= totalM; i++) {
        const interest = Math.round(P * r);
        const principal_pay = i === totalM ? P : 0;
        schedule.push({ month: i, prin: principal_pay, int: interest, total: interest + principal_pay, bal: i === totalM ? 0 : P });
      }
    } else if (method === 'equal') {
      let bal = P;
      for (let i = 1; i <= graceM; i++) {
        const interest = Math.round(bal * r);
        schedule.push({ month: i, prin: 0, int: interest, total: interest, bal });
      }
      const monthly = bal * r * Math.pow(1+r, repayM) / (Math.pow(1+r, repayM) - 1);
      for (let i = 1; i <= repayM; i++) {
        const interest = Math.round(bal * r);
        const prin = Math.round(monthly) - interest;
        bal = Math.max(0, bal - prin);
        schedule.push({ month: graceM + i, prin, int: interest, total: Math.round(monthly), bal });
      }
      if (schedule.length) schedule[schedule.length-1].bal = 0;
    } else {
      let bal = P;
      const prinM = Math.round(P / repayM);
      for (let i = 1; i <= graceM; i++) {
        const interest = Math.round(bal * r);
        schedule.push({ month: i, prin: 0, int: interest, total: interest, bal });
      }
      for (let i = 1; i <= repayM; i++) {
        const interest = Math.round(bal * r);
        const prin = i === repayM ? bal : prinM;
        bal = Math.max(0, bal - prin);
        schedule.push({ month: graceM + i, prin, int: interest, total: prin + interest, bal });
      }
    }

    const totalInt = schedule.reduce((s, r) => s + r.int, 0);
    const totalPay = schedule.reduce((s, r) => s + r.total, 0);
    setResult({ schedule, totalInt, totalPay, graceM });
    setShowAll(false);
  };

  const display = result ? (showAll ? result.schedule : result.schedule.slice(0, 12)) : [];
  const firstRepay = result ? result.schedule[result.graceM] : null;

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Fld label="대출금액 (원)">
            <input value={principal} onChange={e => setPrincipal(cmma(e.target.value))} placeholder="예) 300,000,000" style={inp} />
          </Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="연이율 (%)" flex1>
              <input value={rate} onChange={e => setRate(e.target.value)} placeholder="예) 4.5" style={inp} />
            </Fld>
            <Fld label="대출기간 (년)" flex1>
              <input value={years} onChange={e => setYears(e.target.value.replace(/[^0-9]/g,''))} placeholder="예) 30" style={inp} />
            </Fld>
          </div>
          <Fld label="거치기간 (개월, 이자만 납부)">
            <input value={grace} onChange={e => setGrace(e.target.value.replace(/[^0-9]/g,''))} placeholder="0" style={inp} />
          </Fld>
          <Fld label="상환 방식">
            <Seg opts={[['equal','원리금균등'],['principal','원금균등'],['bullet','만기일시']]} val={method} onChange={setMethod} sm />
          </Fld>
          <button onClick={calc} style={calcBtn}>계산하기</button>
        </div>
      </div>

      {result && (
        <>
          <div style={{ ...card, padding: 16, marginBottom: 16 }}>
            {firstRepay && <Row label={method === 'equal' ? '월 납입금 (균등)' : method === 'principal' ? '첫 달 납입금' : '월 이자 (만기 원금 일시상환)'} value={fmtW(firstRepay.total)} />}
            <Row label="총 납입금" value={fmtW(result.totalPay)} />
            <Row label="총 이자" value={fmtW(result.totalInt)} red />
            <Row label="이자 비율" value={`${((result.totalInt / (parse(principal)||1)) * 100).toFixed(1)}%`} hi last />
          </div>

          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 10 }}>
              상환 스케줄 ({showAll ? result.schedule.length : Math.min(12, result.schedule.length)}개월 표시)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)' }}>
                    {['회차','원금','이자','납입금','잔액'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-sub)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {display.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)' }}>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-sub)' }}>{r.month}회</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(r.prin)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#ef4444' }}>{fmt(r.int)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-sub)' }}>{fmt(r.bal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.schedule.length > 12 && (
              <button onClick={() => setShowAll(s => !s)} style={{ marginTop: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 16px', fontSize: '0.78rem', fontFamily: 'inherit', cursor: 'pointer', color: 'var(--text-sub)' }}>
                {showAll ? '접기' : `전체 ${result.schedule.length}개월 보기`}
              </button>
            )}
            <div style={noteStyle}>* 중도상환·우대금리 미적용 단순 계산입니다.</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 세금: 부가가치세 ─────────────────────────────────────── */
const SIMPLE_RATES = {
  retail:  { label: '소매업',        rate: 0.15 },
  food:    { label: '음식점업',      rate: 0.25 },
  lodging: { label: '숙박업',        rate: 0.25 },
  mfg:     { label: '제조·건설·운수', rate: 0.30 },
  service: { label: '서비스·부동산', rate: 0.40 },
};

function VatCalc() {
  const [taxType, setTaxType] = useState('general');
  const [bizType, setBizType] = useState('retail');
  const [val,     setVal]     = useState('');
  const [dir,     setDir]     = useState('to');

  const rawVal = parse(val);
  let supply = 0, vat = 0, total = 0;
  if (taxType === 'general') {
    supply = dir === 'to' ? rawVal : Math.round(rawVal / 1.1);
    vat    = Math.round(supply * 0.1);
    total  = supply + vat;
  } else {
    supply = rawVal;
    vat    = Math.round(supply * SIMPLE_RATES[bizType].rate * 0.1);
    total  = supply;
  }

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Fld label="과세 유형">
          <Seg opts={[['general','일반과세자'],['simple','간이과세자']]} val={taxType} onChange={v => { setTaxType(v); setVal(''); }} />
        </Fld>
        {taxType === 'general' && (
          <Fld label="계산 방향">
            <Seg opts={[['to','공급가액→합계'],['from','합계→공급가액']]} val={dir} onChange={v => { setDir(v); setVal(''); }} sm />
          </Fld>
        )}
        {taxType === 'simple' && (
          <Fld label="업종 (부가가치율)">
            <select value={bizType} onChange={e => setBizType(e.target.value)} style={inp}>
              {Object.entries(SIMPLE_RATES).map(([k, v]) => (
                <option key={k} value={k}>{v.label} — {(v.rate*100).toFixed(0)}%</option>
              ))}
            </select>
          </Fld>
        )}
        <Fld label={taxType === 'simple' ? '공급대가 (VAT 포함, 원)' : dir === 'to' ? '공급가액 (원)' : '합계금액 (원)'}>
          <input value={val} onChange={e => setVal(cmma(e.target.value))} placeholder="금액 입력" style={inp} />
        </Fld>
      </div>
      {rawVal > 0 && (
        <div style={{ marginTop: 14 }}>
          {taxType === 'general' ? (
            <>
              <Row label="공급가액" value={fmtW(supply)} />
              <Row label="부가가치세 (10%)" value={fmtW(vat)} />
              <Row label="합계 (공급대가)" value={fmtW(total)} hi last />
            </>
          ) : (
            <>
              <Row label="공급대가" value={fmtW(supply)} />
              <Row label={`납부세액 (${(SIMPLE_RATES[bizType].rate*100).toFixed(0)}% × 10%)`} value={fmtW(vat)} hi last />
              <div style={noteStyle}>
                * 간이과세: 공급대가 × 업종별 부가가치율 × 10%<br />
                * 연 매출 4,800만원 미만은 납부 의무 면제
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 세금: 취득세 ──────────────────────────────────────────── */
function AcqTaxCalc() {
  const [price,    setPrice]    = useState('');
  const [propType, setPropType] = useState('house');
  const [houses,   setHouses]   = useState('1');
  const [adj,      setAdj]      = useState(false);
  const [first,    setFirst]    = useState(false);
  const [area,     setArea]     = useState('over85');
  const [result,   setResult]   = useState(null);

  const calc = () => {
    const p = parse(price);
    if (p <= 0) return;
    let acqRate, eduRate, farmRate;

    if (propType === 'land') {
      acqRate = 0.04; eduRate = 0.004; farmRate = 0.002;
    } else {
      const h = parseInt(houses) || 1;
      if (h === 1 || (h === 2 && !adj)) {
        if      (p <= 600_000_000) acqRate = 0.01;
        else if (p <= 900_000_000) acqRate = (p / 100_000_000 * 2/3 - 3) / 100;
        else                       acqRate = 0.03;
      } else if (h === 2 && adj) {
        acqRate = 0.08;
      } else {
        acqRate = adj ? 0.12 : 0.08;
      }

      if (acqRate >= 0.08) {
        eduRate = 0;
        farmRate = acqRate === 0.08 ? 0.006 : 0.010;
      } else {
        eduRate  = acqRate * 0.10;
        farmRate = area === 'over85' ? 0.002 : 0;
      }
    }

    let acq = Math.round(p * acqRate);
    const edu  = Math.round(p * eduRate);
    const farm = Math.round(p * farmRate);

    let firstDiscount = 0;
    if (first && propType === 'house' && parseInt(houses) === 1 && p <= 1_200_000_000) {
      firstDiscount = Math.min(acq, 2_000_000);
      acq -= firstDiscount;
    }

    setResult({ acqRate, acq, edu, farm, firstDiscount, total: acq + edu + farm });
  };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <Fld label="취득 유형">
          <Seg opts={[['house','주택'],['land','토지·비주택']]} val={propType} onChange={v => { setPropType(v); setResult(null); }} />
        </Fld>
        <Fld label="취득가액 (원)">
          <input value={price} onChange={e => setPrice(cmma(e.target.value))} placeholder="예) 500,000,000" style={inp} />
        </Fld>
        {propType === 'house' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <Fld label="취득 후 보유 주택 수" flex1>
                <select value={houses} onChange={e => setHouses(e.target.value)} style={inp}>
                  <option value="1">1주택</option>
                  <option value="2">2주택</option>
                  <option value="3">3주택 이상</option>
                </select>
              </Fld>
              <Fld label="전용면적" flex1>
                <select value={area} onChange={e => setArea(e.target.value)} style={inp}>
                  <option value="under85">85㎡ 이하</option>
                  <option value="over85">85㎡ 초과</option>
                </select>
              </Fld>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={adj} onChange={e => setAdj(e.target.checked)} /> 조정대상지역
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={first} onChange={e => setFirst(e.target.checked)} /> 생애최초 주택
              </label>
            </div>
          </>
        )}
        <button onClick={calc} style={calcBtn}>계산하기</button>
      </div>
      {result && (
        <>
          <Row label={`취득세 (${(result.acqRate * 100).toFixed(2)}%)`} value={fmtW(result.acq + result.firstDiscount)} />
          {result.firstDiscount > 0 && <Row label="생애최초 감면 (최대 200만원)" value={`- ${fmtW(result.firstDiscount)}`} />}
          {result.firstDiscount > 0 && <Row label="감면 후 취득세" value={fmtW(result.acq)} />}
          {result.edu > 0 && <Row label="지방교육세" value={fmtW(result.edu)} />}
          {result.farm > 0 && <Row label="농어촌특별세" value={fmtW(result.farm)} />}
          <Row label="총 납부세액" value={fmtW(result.total)} hi last />
          <div style={noteStyle}>
            * 6억~9억 구간: (취득가액/1억 × 2/3 - 3)% 점진 세율 적용.<br />
            * 조정대상지역 2주택 8%, 3주택 이상 12% 중과.<br />
            * 비주택: 취득세 4% + 지방교육세 0.4% + 농어촌특별세 0.2%.
          </div>
        </>
      )}
    </div>
  );
}

/* ── 세금: 종합소득세 ─────────────────────────────────────── */
function IncomeTaxCalc() {
  const [salary,    setSalary]    = useState('');
  const [deps,      setDeps]      = useState('1');
  const [children,  setChildren]  = useState('0');
  const [insure,    setInsure]    = useState('');
  const [medical,   setMedical]   = useState('');
  const [eduAmt,    setEduAmt]    = useState('');
  const [credit,    setCredit]    = useState('');
  const [debit,     setDebit]     = useState('');
  const [result,    setResult]    = useState(null);

  const calc = () => {
    const 총급여 = parse(salary);
    if (총급여 <= 0) return;

    const 근로소득공제 = Math.min(workDeduction(총급여), 20_000_000);
    const 근로소득금액 = 총급여 - 근로소득공제;

    const 인적공제 = Math.max(1, parseInt(deps)||1) * 1_500_000;
    const 월급여 = Math.round(총급여 / 12);
    const 국민연금연간 = fl10(Math.min(Math.max(월급여,370_000),6_170_000) * 0.045) * 12;
    const 건강보험연간 = fl10(월급여 * 0.03545) * 12;
    const 장기요양연간 = fl10(fl10(월급여 * 0.03545) * 0.1295) * 12;
    const 보험료공제 = 국민연금연간 + 건강보험연간 + 장기요양연간;

    const 신용합계 = parse(credit) + parse(debit);
    const 공제기준 = 총급여 * 0.25;
    const 초과분 = Math.max(0, 신용합계 - 공제기준);
    const 체크초과 = Math.min(parse(debit), 초과분);
    const 신용초과 = Math.max(0, 초과분 - 체크초과);
    const 신용한도 = 총급여 <= 70_000_000 ? 3_000_000 : 총급여 <= 120_000_000 ? 2_500_000 : 2_000_000;
    const 신용카드공제 = Math.min(Math.round(체크초과 * 0.30 + 신용초과 * 0.15), 신용한도);

    const 소득공제합계 = 인적공제 + 보험료공제 + 신용카드공제;
    const 과세표준 = Math.max(0, 근로소득금액 - 소득공제합계);
    const 산출세액 = incomeTaxAmt(과세표준);

    const 근로세액공제 = earnCredit(산출세액, 총급여);
    const 자녀공제 = childTaxCredit(parseInt(children)||0);
    const 보험세액공제 = Math.min(parse(insure) * 0.12, 120_000);
    const 의료비과세 = Math.max(0, parse(medical) - 총급여 * 0.03);
    const 의료비공제 = Math.min(의료비과세, 7_000_000) * 0.15;
    const 교육비공제 = Math.min(parse(eduAmt), 9_000_000) * 0.15;
    const 세액공제합계 = Math.round(근로세액공제 + 자녀공제 + 보험세액공제 + 의료비공제 + 교육비공제);

    const 결정세액 = Math.max(0, 산출세액 - 세액공제합계);
    const 지방소득세 = Math.round(결정세액 * 0.1);
    const 총세액 = 결정세액 + 지방소득세;

    setResult({ 총급여, 근로소득공제, 근로소득금액, 인적공제, 보험료공제, 신용카드공제, 소득공제합계, 과세표준, 산출세액, 근로세액공제, 자녀공제: Math.round(자녀공제), 보험세액공제: Math.round(보험세액공제), 의료비공제: Math.round(의료비공제), 교육비공제: Math.round(교육비공제), 세액공제합계, 결정세액, 지방소득세, 총세액, 실효세율: (총세액/총급여*100) });
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Fld label="연간 총급여 (원)">
            <input value={salary} onChange={e => setSalary(cmma(e.target.value))} placeholder="예) 50,000,000" style={inp} />
          </Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="부양가족 수 (본인 포함)" flex1>
              <input type="number" min="1" max="20" value={deps} onChange={e => setDeps(e.target.value)} style={inp} />
            </Fld>
            <Fld label="20세 이하 자녀 수" flex1>
              <input type="number" min="0" max="10" value={children} onChange={e => setChildren(e.target.value)} style={inp} />
            </Fld>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>특별세액공제 (연간, 선택)</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="보장성 보험료" flex1>
              <input value={insure} onChange={e => setInsure(cmma(e.target.value))} placeholder="0" style={inp} />
            </Fld>
            <Fld label="의료비" flex1>
              <input value={medical} onChange={e => setMedical(cmma(e.target.value))} placeholder="0" style={inp} />
            </Fld>
          </div>
          <Fld label="교육비">
            <input value={eduAmt} onChange={e => setEduAmt(cmma(e.target.value))} placeholder="0" style={inp} />
          </Fld>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>신용카드 소득공제 (연간 사용액)</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="신용카드" flex1>
              <input value={credit} onChange={e => setCredit(cmma(e.target.value))} placeholder="0" style={inp} />
            </Fld>
            <Fld label="체크카드/현금영수증" flex1>
              <input value={debit} onChange={e => setDebit(cmma(e.target.value))} placeholder="0" style={inp} />
            </Fld>
          </div>
          <button onClick={calc} style={calcBtn}>계산하기</button>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 6 }}>소득공제</div>
          <Row label="총급여" value={fmtW(result.총급여)} />
          <Row label="근로소득공제" value={`- ${fmtW(result.근로소득공제)}`} />
          <Row label="근로소득금액" value={fmtW(result.근로소득금액)} />
          <Row label="인적공제" value={`- ${fmtW(result.인적공제)}`} />
          <Row label="보험료공제 (4대보험)" value={`- ${fmtW(result.보험료공제)}`} />
          {result.신용카드공제 > 0 && <Row label="신용카드 소득공제" value={`- ${fmtW(result.신용카드공제)}`} />}
          <Row label="과세표준" value={fmtW(result.과세표준)} />
          <div style={{ fontWeight: 700, fontSize: '0.83rem', margin: '10px 0 6px' }}>세액공제</div>
          <Row label="산출세액" value={fmtW(result.산출세액)} />
          <Row label="근로소득세액공제" value={`- ${fmtW(result.근로세액공제)}`} />
          {result.자녀공제 > 0 && <Row label="자녀세액공제" value={`- ${fmtW(result.자녀공제)}`} />}
          {result.보험세액공제 > 0 && <Row label="보험료 세액공제 (12%)" value={`- ${fmtW(result.보험세액공제)}`} />}
          {result.의료비공제 > 0 && <Row label="의료비 세액공제 (15%)" value={`- ${fmtW(result.의료비공제)}`} />}
          {result.교육비공제 > 0 && <Row label="교육비 세액공제 (15%)" value={`- ${fmtW(result.교육비공제)}`} />}
          <Row label="결정세액 (소득세)" value={fmtW(result.결정세액)} />
          <Row label="지방소득세 (10%)" value={fmtW(result.지방소득세)} />
          <Row label="총 납부세액" value={fmtW(result.총세액)} hi />
          <Row label="실효세율" value={`${result.실효세율.toFixed(2)}%`} hi last />
          <div style={noteStyle}>
            * 신용카드: 총급여 25% 초과분에서 신용 15%, 체크 30% 공제.<br />
            * 의료비: 총급여 3% 초과분의 15%, 한도 700만원.<br />
            * 주택임차차입금·기부금 등 미적용. 실제 세액과 다를 수 있습니다.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 세금: 양도소득세 ─────────────────────────────────────── */
function CapGainCalc() {
  const [acqP,   setAcqP]   = useState('');
  const [saleP,  setSaleP]  = useState('');
  const [exp,    setExp]    = useState('');
  const [holdY,  setHoldY]  = useState('');
  const [residY, setResidY] = useState('0');
  const [is1H,   setIs1H]   = useState(true);
  const [result, setResult] = useState(null);

  const calc = () => {
    const 취득가 = parse(acqP);
    const 양도가 = parse(saleP);
    const 필요경비 = parse(exp);
    const 보유년 = parseInt(holdY) || 0;
    const 거주년 = parseInt(residY) || 0;
    if (취득가 <= 0 || 양도가 <= 0) return;

    const 양도차익 = 양도가 - 취득가 - 필요경비;
    if (양도차익 <= 0) {
      setResult({ 양도차익, zero: true }); return;
    }

    const 비과세요건 = is1H && 보유년 >= 2 && 양도가 <= 1_200_000_000;
    if (비과세요건) {
      setResult({ 양도차익, exempt: true }); return;
    }

    let 과세차익 = 양도차익;
    let 부분비과세 = false;
    if (is1H && 보유년 >= 2 && 양도가 > 1_200_000_000) {
      과세차익 = Math.round(양도차익 * (양도가 - 1_200_000_000) / 양도가);
      부분비과세 = true;
    }

    let shortRate = null;
    if (보유년 < 1) shortRate = 0.70;
    else if (보유년 < 2) shortRate = 0.60;

    let 장보율 = 0;
    if (!shortRate && 보유년 >= 3) {
      if (is1H && 거주년 >= 2) {
        장보율 = Math.min(Math.min(보유년,10)*0.04 + Math.min(거주년,10)*0.04, 0.80);
      } else {
        장보율 = Math.min(보유년 * 0.02, 0.30);
      }
    }

    const 장보공제 = Math.round(과세차익 * 장보율);
    const 기본공제 = 2_500_000;
    const 과세표준 = Math.max(0, 과세차익 - 장보공제 - 기본공제);
    const 산출세액 = shortRate ? Math.round(과세표준 * shortRate) : Math.round(incomeTaxAmt(과세표준));
    const 지방소득세 = Math.round(산출세액 * 0.1);

    setResult({ 양도차익, 과세차익, 장보율: (장보율*100).toFixed(0), 장보공제, 기본공제, 과세표준, 산출세액, 지방소득세, 총세액: 산출세액 + 지방소득세, shortRate, 부분비과세 });
  };

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="취득가액 (원)" flex1>
              <input value={acqP} onChange={e => setAcqP(cmma(e.target.value))} placeholder="예) 300,000,000" style={inp} />
            </Fld>
            <Fld label="양도가액 (원)" flex1>
              <input value={saleP} onChange={e => setSaleP(cmma(e.target.value))} placeholder="예) 600,000,000" style={inp} />
            </Fld>
          </div>
          <Fld label="필요경비 (취득세+중개수수료+수리비 등, 원)">
            <input value={exp} onChange={e => setExp(cmma(e.target.value))} placeholder="예) 5,000,000" style={inp} />
          </Fld>
          <div style={{ display: 'flex', gap: 10 }}>
            <Fld label="보유기간 (년)" flex1>
              <input type="number" min="0" value={holdY} onChange={e => setHoldY(e.target.value)} placeholder="예) 5" style={inp} />
            </Fld>
            <Fld label="거주기간 (년)" flex1>
              <input type="number" min="0" value={residY} onChange={e => setResidY(e.target.value)} placeholder="예) 3" style={inp} />
            </Fld>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={is1H} onChange={e => setIs1H(e.target.checked)} />
            1세대1주택 (2년 이상 보유 시 비과세, 12억 이하)
          </label>
          <button onClick={calc} style={calcBtn}>계산하기</button>
        </div>
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          {result.zero ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-sub)', fontSize: '0.9rem' }}>양도차익이 없어 납부세액이 없습니다.</div>
          ) : result.exempt ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: '1.8rem', color: '#22c55e' }}>✓</div>
              <div style={{ fontWeight: 800, color: '#16a34a', marginTop: 6 }}>비과세 대상</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 4 }}>1세대1주택 · 2년 이상 보유 · 양도가 12억 이하</div>
              <div style={{ marginTop: 10, fontWeight: 700 }}>양도차익 {fmtW(result.양도차익)}</div>
            </div>
          ) : (
            <>
              {result.부분비과세 && (
                <div style={{ background: 'rgba(99,102,241,.08)', borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem', color: 'var(--indigo-600,#4f46e5)', marginBottom: 10 }}>
                  1세대1주택 부분 비과세 — 양도가 12억 초과분만 과세
                </div>
              )}
              <Row label="양도차익" value={fmtW(result.양도차익)} />
              {result.부분비과세 && <Row label="과세 대상 양도차익" value={fmtW(result.과세차익)} />}
              {result.장보율 > '0' && <Row label={`장기보유특별공제 (${result.장보율}%)`} value={`- ${fmtW(result.장보공제)}`} />}
              <Row label="기본공제" value={`- ${fmtW(result.기본공제)}`} />
              <Row label="과세표준" value={fmtW(result.과세표준)} />
              <Row label={result.shortRate ? `양도소득세 (단기 중과 ${(result.shortRate*100).toFixed(0)}%)` : '양도소득세'} value={fmtW(result.산출세액)} red={!!result.shortRate} />
              <Row label="지방소득세 (10%)" value={fmtW(result.지방소득세)} />
              <Row label="총 납부세액" value={fmtW(result.총세액)} hi last />
              <div style={noteStyle}>
                * 1세대1주택 장특공제: 보유 4%/년 + 거주 4%/년 (최대 80%).<br />
                * 일반 장특공제: 3년 이상 보유 시 2%/년 (최대 30%).<br />
                * 단기 중과: 1년 미만 70%, 1~2년 60%.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 세금 탭 묶음 ─────────────────────────────────────────── */
const TAX_TABS = [
  { id: 'vat',     label: '부가가치세' },
  { id: 'acq',     label: '취득세' },
  { id: 'income',  label: '종합소득세' },
  { id: 'capgain', label: '양도소득세' },
];
function TaxCalc() {
  const [sub, setSub] = useState('vat');
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--border-lt,#f1f5f9)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {TAX_TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            flex: '1 1 80px', padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 600, transition: 'all .15s',
            background: sub === t.id ? 'var(--card)' : 'transparent',
            color:      sub === t.id ? 'var(--text)' : 'var(--text-sub)',
          }}>{t.label}</button>
        ))}
      </div>
      {sub === 'vat'     && <VatCalc />}
      {sub === 'acq'     && <AcqTaxCalc />}
      {sub === 'income'  && <IncomeTaxCalc />}
      {sub === 'capgain' && <CapGainCalc />}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────── */
const MAIN_TABS = [
  { id: 'sci',    label: '공학용',    icon: 'fa-superscript' },
  { id: 'salary', label: '급여',      icon: 'fa-won-sign' },
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
