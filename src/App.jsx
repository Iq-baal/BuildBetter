import React, { useState, useEffect, useRef } from 'react';
import { TrendingDown, AlertTriangle, Target, DollarSign, BarChart3, Zap, Layers } from 'lucide-react';

// yeah i know this is overkill but the fluid effect is worth it
const FluidBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // init particles - trying to keep this performant
    const particleCount = 150;
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        color: `hsla(${Math.random() * 60 + 200}, 70%, 60%, 0.6)` // blues to purples
      });
    }
    
    // mouse tracking - debounced because we dont need every pixel
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // animation loop
    let animationId;
    const animate = () => {
      ctx.fillStyle = 'rgba(8, 10, 28, 0.1)'; // fade trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((p, i) => {
        // update position
        p.x += p.vx;
        p.y += p.vy;
        
        // mouse interaction - pulls particles towards mouse
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 200) {
          const force = (200 - dist) / 200;
          p.vx += (dx / dist) * force * 0.1;
          p.vy += (dy / dist) * force * 0.1;
        }
        
        // damping so they dont go crazy
        p.vx *= 0.95;
        p.vy *= 0.95;
        
        // wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // connect nearby particles - this creates the fluid mesh effect
        particlesRef.current.slice(i + 1).forEach(p2 => {
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          
          if (dist2 < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `hsla(220, 70%, 60%, ${0.2 * (1 - dist2 / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default function BuildBetter() {
  const [pitch, setPitch] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedAnalyses, setSavedAnalyses] = useState([]);

  useEffect(() => {
    loadSavedAnalyses();
  }, []);

  const loadSavedAnalyses = async () => {
    try {
      const keys = await window.storage.list('analysis:');
      if (keys && keys.keys) {
        const analyses = await Promise.all(
          keys.keys.map(async (key) => {
            try {
              const result = await window.storage.get(key);
              return result ? JSON.parse(result.value) : null;
            } catch {
              return null;
            }
          })
        );
        setSavedAnalyses(analyses.filter(a => a !== null).sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (err) {
      // first time user probably
      console.log('no saved analyses');
    }
  };

  // hash function for consistent analysis - same pitch = same hash = same analysis
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // convert to 32bit int
    }
    return Math.abs(hash);
  };

  const analyzeStartup = async () => {
    if (!pitch.trim()) {
      setError('need a pitch to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // check if we already analyzed this exact pitch
      const pitchHash = hashString(pitch.toLowerCase().trim());
      const existingAnalysis = savedAnalyses.find(a => 
        hashString(a.pitch.toLowerCase().trim()) === pitchHash
      );
      
      if (existingAnalysis) {
        // just show the cached one - no need to waste api calls
        setAnalysis(existingAnalysis);
        setLoading(false);
        return;
      }

      // get api key - either from env or prompt user
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
      
      if (!apiKey) {
        const userKey = prompt('need your gemini api key (free at https://aistudio.google.com/app/apikey):');
        if (!userKey) {
          throw new Error('api key required');
        }
        localStorage.setItem('gemini_api_key', userKey);
      }

      // add seed to prompt for consistency - same pitch = same seed = same response
      const seed = pitchHash % 10000;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey || localStorage.getItem('gemini_api_key')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are BuildBetter AI - a brutally honest startup failure analyst.

CRITICAL: Your analysis must be DETERMINISTIC and CONSISTENT. For the same startup idea, you must give IDENTICAL scores and reasoning every time. Use the seed number ${seed} to maintain consistency.

Your role:
- Analyze startup viability using historical failure patterns
- Be skeptical, evidence-driven, unsentimental
- NO POLITENESS. NO HYPE. NO HEDGING.
- Be direct, structured, accurate

OUTPUT ONLY VALID JSON (no markdown, no preamble, no code blocks):
{
  "failureProbability": <number 0-100>,
  "topFailureReasons": [
    "<specific technical reason 1>",
    "<specific market reason 2>",
    "<specific execution reason 3>"
  ],
  "marketSentimentIndex": <number 0-100>,
  "marketSentimentExplanation": [
    "<macro trend observation>",
    "<investor behavior pattern>",
    "<market saturation insight>"
  ],
  "exitAlignmentScore": <number 0-100>,
  "exitAlignmentExplanation": {
    "acquirerTypes": "<likely acquirers>",
    "attractiveness": "<why they would or wouldnt buy>"
  },
  "historicalFailurePatterns": "<compare to 2-3 specific failed startups with similar patterns>",
  "whatCouldChange": [
    "<concrete tactical change 1>",
    "<concrete tactical change 2>",
    "<concrete tactical change 3>"
  ],
  "brutalSummary": "<one paragraph truth bomb - no sugar coating>"
}

STARTUP PITCH:
${pitch}

CONSISTENCY SEED: ${seed} - Use this to ensure identical analysis for identical pitches.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3, // lower temp for more consistent responses
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 8192,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error?.message || 'api call failed';
        
        // if model not found, try to list available models
        if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          console.error('Model not available. Trying to list available models...');
          
          try {
            const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey || localStorage.getItem('gemini_api_key')}`);
            const models = await listResponse.json();
            console.log('Available models:', models);
          } catch (e) {
            console.error('Could not list models:', e);
          }
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // strip any markdown formatting that gemini might add
      let jsonText = content.trim();
      jsonText = jsonText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      jsonText = jsonText.replace(/^```\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('ai returned garbage');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      
      const analysisWithMeta = {
        ...analysisData,
        pitch,
        pitchHash,
        timestamp: Date.now(),
        id: `analysis:${Date.now()}`
      };
      
      setAnalysis(analysisWithMeta);
      
      // save for future lookups
      await window.storage.set(analysisWithMeta.id, JSON.stringify(analysisWithMeta));
      await loadSavedAnalyses();
      
    } catch (err) {
      setError('analysis failed: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = (savedAnalysis) => {
    setAnalysis(savedAnalysis);
    setPitch(savedAnalysis.pitch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAnalysis = async (id) => {
    try {
      await window.storage.delete(id);
      await loadSavedAnalyses();
      if (analysis && analysis.id === id) {
        setAnalysis(null);
      }
    } catch (err) {
      console.error('delete failed:', err);
    }
  };

  // color helpers for scores
  const getScoreColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const getInverseScoreColor = (score) => {
    if (score <= 30) return '#ef4444';
    if (score <= 60) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080a1c',
      fontFamily: '"Sora", -apple-system, sans-serif',
      color: '#e8eaed',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Fira+Code:wght@300;400;500&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          overflow-x: hidden;
        }

        /* smooth scroll */
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeInUp 0.6s ease-out;
        }

        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          animation: shimmer 3s infinite;
        }

        .glass-card:hover {
          transform: translateY(-4px);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 20px 60px rgba(139, 92, 246, 0.2);
        }

        textarea {
          font-family: 'Fira Code', monospace;
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid rgba(139, 92, 246, 0.2);
          color: #e8eaed;
          padding: 20px;
          border-radius: 12px;
          width: 100%;
          resize: vertical;
          transition: all 0.3s ease;
          font-size: 15px;
          line-height: 1.6;
        }

        textarea:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1), 0 8px 32px rgba(139, 92, 246, 0.2);
          background: rgba(0, 0, 0, 0.6);
        }

        textarea::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        button {
          font-family: 'Sora', sans-serif;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none;
          color: white;
          padding: 18px 48px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #a78bfa, #818cf8);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        button:hover::before {
          opacity: 1;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(139, 92, 246, 0.4);
        }

        button:active {
          transform: translateY(0);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        button span {
          position: relative;
          z-index: 1;
        }

        .progress-bar {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          border-radius: 3px;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 2s infinite;
        }

        .history-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .history-item:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateX(8px);
        }

        .metric-number {
          font-weight: 800;
          font-size: 56px;
          line-height: 1;
          background: linear-gradient(135deg, currentColor, currentColor);
          -webkit-background-clip: text;
          background-clip: text;
        }

        /* mobile responsive */
        @media (max-width: 768px) {
          .glass-card {
            padding: 20px;
          }
          
          .metric-number {
            font-size: 42px;
          }

          button {
            padding: 14px 32px;
            font-size: 14px;
          }

          textarea {
            font-size: 14px;
          }
        }
      `}</style>

      {/* fluid background effect */}
      <FluidBackground />

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '60px 24px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* header */}
        <div style={{ 
          marginBottom: '64px', 
          textAlign: 'center',
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '24px',
            animation: 'float 6s ease-in-out infinite'
          }}>
            <Layers size={48} color="#8b5cf6" strokeWidth={2.5} />
          </div>
          <h1 style={{ 
            fontSize: 'clamp(48px, 8vw, 72px)', 
            fontWeight: '800',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            BuildBetter
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontWeight: '400',
            letterSpacing: '0.5px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Evidence-driven startup viability analysis powered by AI
          </p>
        </div>

        {/* input section */}
        <div style={{ marginBottom: '64px', animation: 'fadeInUp 0.8s ease-out 0.1s backwards' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            color: 'rgba(255, 255, 255, 0.8)',
            textTransform: 'uppercase'
          }}>
            Startup Pitch
          </label>
          <textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="describe your startup idea, target market, business model, and key differentiators..."
            rows={6}
          />
          
          {error && (
            <div style={{ 
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#ef4444',
              fontSize: '14px',
              fontFamily: 'Fira Code, monospace'
            }}>
              {error}
            </div>
          )}

          <button
            onClick={analyzeStartup}
            disabled={loading}
            style={{ marginTop: '20px' }}
          >
            <span style={{ animation: loading ? 'pulse 1.5s infinite' : 'none' }}>
              {loading ? 'analyzing...' : 'analyze startup'}
            </span>
          </button>
        </div>

        {/* analysis results */}
        {analysis && (
          <div style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            {/* critical metrics */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              marginBottom: '48px'
            }}>
              {/* failure probability */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <TrendingDown size={24} color="#ef4444" style={{ marginRight: '12px' }} />
                  <h3 style={{ 
                    fontSize: '12px', 
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    Failure Probability
                  </h3>
                </div>
                <div className="metric-number" style={{ 
                  color: getScoreColor(analysis.failureProbability),
                  marginBottom: '16px'
                }}>
                  {analysis.failureProbability}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${analysis.failureProbability}%`,
                      background: `linear-gradient(90deg, ${getScoreColor(analysis.failureProbability)}, ${getScoreColor(analysis.failureProbability)}dd)`
                    }}
                  />
                </div>
              </div>

              {/* market sentiment */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <BarChart3 size={24} color="#6366f1" style={{ marginRight: '12px' }} />
                  <h3 style={{ 
                    fontSize: '12px', 
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    Market Sentiment
                  </h3>
                </div>
                <div className="metric-number" style={{ 
                  color: getInverseScoreColor(analysis.marketSentimentIndex),
                  marginBottom: '16px'
                }}>
                  {analysis.marketSentimentIndex}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${analysis.marketSentimentIndex}%`,
                      background: `linear-gradient(90deg, ${getInverseScoreColor(analysis.marketSentimentIndex)}, ${getInverseScoreColor(analysis.marketSentimentIndex)}dd)`
                    }}
                  />
                </div>
              </div>

              {/* exit alignment */}
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                  <Target size={24} color="#8b5cf6" style={{ marginRight: '12px' }} />
                  <h3 style={{ 
                    fontSize: '12px', 
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    Exit Alignment
                  </h3>
                </div>
                <div className="metric-number" style={{ 
                  color: getInverseScoreColor(analysis.exitAlignmentScore),
                  marginBottom: '16px'
                }}>
                  {analysis.exitAlignmentScore}%
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${analysis.exitAlignmentScore}%`,
                      background: `linear-gradient(90deg, ${getInverseScoreColor(analysis.exitAlignmentScore)}, ${getInverseScoreColor(analysis.exitAlignmentScore)}dd)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* brutal summary */}
            <div className="glass-card" style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <AlertTriangle size={24} color="#f59e0b" style={{ marginRight: '12px' }} />
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  The Verdict
                </h3>
              </div>
              <p style={{ 
                fontSize: '17px', 
                lineHeight: '1.8',
                color: '#e8eaed',
                fontFamily: 'Fira Code, monospace',
                fontWeight: '400'
              }}>
                {analysis.brutalSummary}
              </p>
            </div>

            {/* detailed analysis */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {/* failure reasons */}
              <div className="glass-card">
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '24px',
                  fontWeight: '600',
                  color: '#ef4444'
                }}>
                  Top Failure Risks
                </h3>
                <ul style={{ listStyle: 'none' }}>
                  {analysis.topFailureReasons.map((reason, idx) => (
                    <li key={idx} style={{ 
                      marginBottom: '20px',
                      paddingLeft: '32px',
                      position: 'relative',
                      fontSize: '15px',
                      lineHeight: '1.7',
                      fontFamily: 'Fira Code, monospace',
                      color: 'rgba(255, 255, 255, 0.85)'
                    }}>
                      <span style={{ 
                        position: 'absolute',
                        left: '0',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '16px'
                      }}>
                        {idx + 1}.
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* market sentiment */}
              <div className="glass-card">
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '24px',
                  fontWeight: '600',
                  color: '#6366f1'
                }}>
                  Market Insights
                </h3>
                <ul style={{ listStyle: 'none' }}>
                  {analysis.marketSentimentExplanation.map((point, idx) => (
                    <li key={idx} style={{ 
                      marginBottom: '20px',
                      paddingLeft: '32px',
                      position: 'relative',
                      fontSize: '15px',
                      lineHeight: '1.7',
                      fontFamily: 'Fira Code, monospace',
                      color: 'rgba(255, 255, 255, 0.85)'
                    }}>
                      <span style={{ 
                        position: 'absolute',
                        left: '0',
                        color: '#6366f1',
                        fontSize: '20px'
                      }}>
                        •
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* exit alignment */}
              <div className="glass-card">
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '24px',
                  fontWeight: '600',
                  color: '#8b5cf6'
                }}>
                  Exit Strategy
                </h3>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    Likely Acquirers
                  </div>
                  <p style={{ 
                    fontSize: '15px',
                    lineHeight: '1.7',
                    fontFamily: 'Fira Code, monospace',
                    color: 'rgba(255, 255, 255, 0.85)'
                  }}>
                    {analysis.exitAlignmentExplanation.acquirerTypes}
                  </p>
                </div>
                <div>
                  <div style={{ 
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    Attractiveness
                  </div>
                  <p style={{ 
                    fontSize: '15px',
                    lineHeight: '1.7',
                    fontFamily: 'Fira Code, monospace',
                    color: 'rgba(255, 255, 255, 0.85)'
                  }}>
                    {analysis.exitAlignmentExplanation.attractiveness}
                  </p>
                </div>
              </div>

              {/* historical patterns */}
              <div className="glass-card">
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  marginBottom: '24px',
                  fontWeight: '600',
                  color: '#f59e0b'
                }}>
                  Historical Parallels
                </h3>
                <p style={{ 
                  fontSize: '15px',
                  lineHeight: '1.7',
                  fontFamily: 'Fira Code, monospace',
                  color: 'rgba(255, 255, 255, 0.85)'
                }}>
                  {analysis.historicalFailurePatterns}
                </p>
              </div>
            </div>

            {/* what could change */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Zap size={24} color="#10b981" style={{ marginRight: '12px' }} />
                <h3 style={{ 
                  fontSize: '14px', 
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontWeight: '600',
                  color: '#10b981'
                }}>
                  Path Forward
                </h3>
              </div>
              <ul style={{ listStyle: 'none' }}>
                {analysis.whatCouldChange.map((change, idx) => (
                  <li key={idx} style={{ 
                    marginBottom: '20px',
                    paddingLeft: '32px',
                    position: 'relative',
                    fontSize: '15px',
                    lineHeight: '1.7',
                    fontFamily: 'Fira Code, monospace',
                    color: 'rgba(255, 255, 255, 0.85)'
                  }}>
                    <span style={{ 
                      position: 'absolute',
                      left: '0',
                      color: '#10b981',
                      fontWeight: '700',
                      fontSize: '18px'
                    }}>
                      →
                    </span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* history */}
        {savedAnalyses.length > 0 && (
          <div style={{ marginTop: '80px' }}>
            <h2 style={{ 
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '32px',
              color: '#e8eaed',
              letterSpacing: '-0.01em'
            }}>
              Past Analyses
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {savedAnalyses.map((saved) => (
                <div 
                  key={saved.id}
                  className="history-item"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div 
                    onClick={() => loadAnalysis(saved)}
                    style={{ flex: 1 }}
                  >
                    <div style={{ 
                      fontSize: '14px',
                      marginBottom: '8px',
                      fontFamily: 'Fira Code, monospace',
                      color: '#e8eaed',
                      fontWeight: '400'
                    }}>
                      {saved.pitch.substring(0, 120)}...
                    </div>
                    <div style={{ 
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      display: 'flex',
                      gap: '20px',
                      fontFamily: 'Fira Code, monospace'
                    }}>
                      <span>failure risk: {saved.failureProbability}%</span>
                      <span>•</span>
                      <span>{new Date(saved.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnalysis(saved.id);
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '12px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      marginLeft: '20px'
                    }}
                  >
                    <span>delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ 
          marginTop: '100px',
          paddingTop: '40px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          textAlign: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.3)',
          letterSpacing: '0.5px',
          fontFamily: 'Fira Code, monospace'
        }}>
          powered by google gemini • evidence-driven analysis • no hype
        </div>
      </div>
    </div>
  );
}
