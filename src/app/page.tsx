'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Target, TrendingUp, TrendingDown, RotateCcw, Trash2, Zap,
  BarChart3, Activity, Brain, Shield, ChevronUp, ChevronDown,
  Upload, History, Sparkles, AlertCircle, CheckCircle2, XCircle,
  Minus, Plus, Gauge, Crown, Flame, Snowflake
} from 'lucide-react';
import {
  Dozen, Prediction, SystemPrediction, PatternType, getDozen, isRed, isBlack,
  DOZEN_COLORS, DOZEN_BG_COLORS, DOZEN_LABELS, formatPrediction,
  RED_NUMBERS, BLACK_NUMBERS,
} from '@/lib/roulette/types';

// ============================================================
// Types for API responses
// ============================================================
interface PreviousResult {
  system1: boolean;
  system2: boolean;
  system3: boolean;
  combined: boolean;
  previousNumber: number;
}

interface SystemStats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

interface ApiStats {
  system1: SystemStats;
  system2: SystemStats;
  system3: SystemStats;
  combined: SystemStats;
}

interface SpinData {
  number: number;
  dozen: Dozen;
  timestamp: number;
}

// History entry from API
interface ApiHistoryEntry {
  uniqueId: number;
  result: string;
  triggerNumber: number;
  totalNumber: number;
  isWin: boolean;
  explanation: string;
  system1Result: string;
  system2Result: string;
  system3Result: string;
  combinedResult: string;
  patternType: PatternType;
}

// ============================================================
// Helper components
// ============================================================

function DozenBadge({ dozen }: { dozen: number }) {
  const colorMap: Record<number, string> = {
    0: 'bg-gray-500 text-white',
    1: 'bg-emerald-500 text-white',
    2: 'bg-amber-500 text-white',
    3: 'bg-rose-500 text-white',
  };
  const labelMap: Record<number, string> = {
    0: '0',
    1: 'D1',
    2: 'D2',
    3: 'D3',
  };
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${colorMap[dozen] || 'bg-gray-300'}`}>
      {labelMap[dozen]}
    </span>
  );
}

function NumberButton({ num, onClick, disabled }: { num: number; onClick: (n: number) => void; disabled?: boolean }) {
  const isZero = num === 0;
  const isRedNum = isRed(num);
  const bgClass = isZero
    ? 'bg-green-600 hover:bg-green-700'
    : isRedNum
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-zinc-800 hover:bg-zinc-900';
  
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      disabled={disabled}
      onClick={() => onClick(num)}
      className={`${bgClass} text-white font-bold rounded-lg w-10 h-10 sm:w-11 sm:h-11 text-sm flex items-center justify-center transition-colors disabled:opacity-50 shadow-md`}
    >
      {num}
    </motion.button>
  );
}

function PredictionCard({ 
  title, prediction, isCorrect, icon: Icon, color 
}: { 
  title: string; prediction: Prediction; isCorrect?: boolean | null; 
  icon: React.ElementType; color: string;
}) {
  const isWait = prediction.dozens.length === 0;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`relative overflow-hidden border-2 shadow-sm ${isCorrect === true ? 'border-green-500' : isCorrect === false ? 'border-red-500' : 'border-border'}`}>
        {isCorrect !== null && isCorrect !== undefined && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2"
          >
            {isCorrect ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
          </motion.div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isWait ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Wait for pattern...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                {prediction.dozens.map(d => (
                  <Badge key={d} className={`${DOZEN_BG_COLORS[d]} text-sm px-3 py-1`}>
                    {DOZEN_LABELS[d]}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Progress value={prediction.confidence * 100} className="h-2 flex-1" />
                <span className="text-xs font-bold">{Math.round(prediction.confidence * 100)}%</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Pattern: {prediction.patternType}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, trend, color }: {
  label: string; value: string | number; icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral'; color?: string;
}) {
  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
        </div>
        <div className="flex items-center gap-1">
          <Icon className={`w-5 h-5 ${color || 'text-muted-foreground'}`} />
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function RoulettePage() {
  const [spins, setSpins] = useState<SpinData[]>([]);
  const [prediction, setPrediction] = useState<SystemPrediction | null>(null);
  const [previousResult, setPreviousResult] = useState<PreviousResult | null>(null);
  const [scores, setScores] = useState({ system1: 0, system2: 0, system3: 0, combined: 0 });
  const [stats, setStats] = useState<ApiStats>({
    system1: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    system2: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    system3: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
    combined: { total: 0, correct: 0, streak: 0, bestStreak: 0 },
  });
  const [dozenDist, setDozenDist] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [recentWinRate, setRecentWinRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [lastAddedNumber, setLastAddedNumber] = useState<number | null>(null);
  const [resultFlash, setResultFlash] = useState<'win' | 'loss' | null>(null);
  const [history, setHistory] = useState<ApiHistoryEntry[]>([]);

  const apiCall = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, sessionId }),
      });
      const data = await res.json();
      
      if (data.success || data.spins) {
        if (data.spins) setSpins(data.spins);
        if (data.prediction) setPrediction(data.prediction);
        if (data.previousResult) {
          setPreviousResult(data.previousResult);
          // Flash effect
          const isWin = data.previousResult.combined;
          setResultFlash(isWin ? 'win' : 'loss');
          setTimeout(() => setResultFlash(null), 1500);
        }
        if (data.scores) setScores(data.scores);
        if (data.stats) setStats(data.stats);
        if (data.dozenDistribution) setDozenDist(data.dozenDistribution);
        if (data.recentWinRate !== undefined) setRecentWinRate(data.recentWinRate);
        if (data.history) setHistory(data.history);
      }
      return data;
    } catch (err) {
      console.error('API error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const addSpin = useCallback((num: number) => {
    setLastAddedNumber(num);
    apiCall({ action: 'addSpin', number: num });
  }, [apiCall]);

  const addBulkSpins = useCallback(() => {
    const nums = bulkInput
      .split(/[\n,\s]+/)
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 0 && n <= 36);
    
    if (nums.length === 0) return;
    apiCall({ action: 'addBulkSpins', numbers: nums });
    setBulkInput('');
  }, [bulkInput, apiCall]);

  const undo = useCallback(() => {
    apiCall({ action: 'undo' });
    setPreviousResult(null);
  }, [apiCall]);

  const clearAll = useCallback(() => {
    apiCall({ action: 'clear' });
    setPrediction(null);
    setPreviousResult(null);
  }, [apiCall]);

  // Keyboard shortcut for quick number entry
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        // Could implement multi-digit entry here
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const totalSpins = spins.length;
  const combinedWinRate = stats.combined.total > 0 
    ? ((stats.combined.correct / stats.combined.total) * 100).toFixed(1) 
    : '0.0';

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 text-gray-900">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                  Roulette AI Predictor
                </h1>
                <p className="text-xs text-gray-500">Danger Dozen System v2.0 + AI Learning</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                <Brain className="w-3 h-3 mr-1" />
                AI Active
              </Badge>
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                <Zap className="w-3 h-3 mr-1" />
                3 Systems
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
          
          {/* Flash overlay for win/loss */}
          <AnimatePresence>
            {resultFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                exit={{ opacity: 0 }}
                className={`fixed inset-0 z-40 pointer-events-none ${
                  resultFlash === 'win' ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            )}
          </AnimatePresence>

          {/* Top Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Spins"
              value={totalSpins}
              icon={Activity}
              color="text-emerald-600"
            />
            <StatCard
              label="Win Rate"
              value={`${combinedWinRate}%`}
              icon={Target}
              trend={parseFloat(combinedWinRate) >= 70 ? 'up' : parseFloat(combinedWinRate) >= 40 ? 'neutral' : 'down'}
              color={parseFloat(combinedWinRate) >= 70 ? 'text-green-600' : parseFloat(combinedWinRate) >= 40 ? 'text-amber-600' : 'text-red-600'}
            />
            <StatCard
              label="AI Score"
              value={scores.combined}
              icon={Brain}
              trend={scores.combined > 0 ? 'up' : scores.combined < 0 ? 'down' : 'neutral'}
              color={scores.combined > 0 ? 'text-green-600' : scores.combined < 0 ? 'text-red-600' : 'text-gray-500'}
            />
            <StatCard
              label="Best Streak"
              value={stats.combined.bestStreak}
              icon={Flame}
              color="text-amber-600"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column - Input & Prediction */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Number Input Grid */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Enter Roulette Number
                  </CardTitle>
                  <CardDescription className="text-gray-500 text-xs">
                    Click a number or use bulk input below
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {/* Zero */}
                    <NumberButton num={0} onClick={addSpin} disabled={loading} />
                    {/* 1-36 */}
                    {Array.from({ length: 36 }, (_, i) => i + 1).map(num => (
                      <NumberButton key={num} num={num} onClick={addSpin} disabled={loading} />
                    ))}
                  </div>
                  
                  <Separator className="my-4 bg-gray-200" />
                  
                  {/* Bulk Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">Bulk Input (comma or newline separated)</label>
                    <Textarea
                      placeholder="e.g., 5, 14, 23, 32, 7, 19"
                      value={bulkInput}
                      onChange={e => setBulkInput(e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={addBulkSpins}
                        disabled={loading || !bulkInput.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        <Upload className="w-3 h-3 mr-1" />
                        Add All
                      </Button>
                      <Button
                        onClick={undo}
                        disabled={loading || totalSpins === 0}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Undo
                      </Button>
                      <Button
                        onClick={clearAll}
                        disabled={loading || totalSpins === 0}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Last Added Number Display */}
              <AnimatePresence mode="wait">
                {lastAddedNumber !== null && (
                  <motion.div
                    key={lastAddedNumber}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="flex items-center justify-center gap-3 py-2"
                  >
                    <span className="text-sm text-gray-500">Last entered:</span>
                    <motion.div
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 0.5 }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                        lastAddedNumber === 0 
                          ? 'bg-green-600' 
                          : isRed(lastAddedNumber) 
                          ? 'bg-red-600' 
                          : 'bg-zinc-800'
                      }`}
                    >
                      {lastAddedNumber}
                    </motion.div>
                    <DozenBadge dozen={getDozen(lastAddedNumber)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Predictions & Charts */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Combined AI Prediction - BIG DISPLAY */}
              <motion.div
                animate={resultFlash ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Card className={`bg-white shadow-md border-2 ${
                  resultFlash === 'win' ? 'border-green-500' : resultFlash === 'loss' ? 'border-red-500' : 'border-emerald-300'
                } overflow-hidden relative`}>
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-amber-500/5" />
                  
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                      AI Combined Prediction
                      {prediction?.combined.patternType === 'ai-learned' && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs ml-2">
                          <Brain className="w-3 h-3 mr-1" />
                          AI Enhanced
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    {prediction && prediction.combined.dozens.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          {prediction.combined.dozens.map(d => (
                            <motion.div
                              key={d}
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className={`${DOZEN_BG_COLORS[d]} px-6 py-3 rounded-xl text-lg font-bold shadow-lg`}
                            >
                              {DOZEN_LABELS[d]}
                            </motion.div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">Confidence</span>
                              <span className="text-sm font-bold text-emerald-600">
                                {Math.round(prediction.combined.confidence * 100)}%
                              </span>
                            </div>
                            <Progress 
                              value={prediction.combined.confidence * 100} 
                              className="h-3"
                            />
                          </div>
                          <Badge variant="outline" className="text-xs border-gray-200">
                            {prediction.patternType}
                          </Badge>
                        </div>

                        {/* Previous Result */}
                        {previousResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-3 rounded-lg ${
                              previousResult.combined 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-sm">
                              {previousResult.combined ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-gray-700">
                                Number {previousResult.previousNumber} → 
                                {previousResult.combined ? ' WIN!' : ' Miss'}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8 text-gray-500">
                        <div className="text-center">
                          <Target className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Enter at least 3 numbers to get predictions</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 3 System Predictions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PredictionCard
                  title="System 1"
                  prediction={prediction?.system1 || { dozens: [], label: 'Wait', patternType: 'wait' as const, confidence: 0 }}
                  isCorrect={previousResult?.system1 ?? null}
                  icon={Shield}
                  color="text-emerald-600"
                />
                <PredictionCard
                  title="System 2"
                  prediction={prediction?.system2 || { dozens: [], label: 'Wait', patternType: 'wait' as const, confidence: 0 }}
                  isCorrect={previousResult?.system2 ?? null}
                  icon={Shield}
                  color="text-amber-600"
                />
                <PredictionCard
                  title="System 3"
                  prediction={prediction?.system3 || { dozens: [], label: 'Wait', patternType: 'wait' as const, confidence: 0 }}
                  isCorrect={previousResult?.system3 ?? null}
                  icon={Shield}
                  color="text-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="bg-gray-100 border border-gray-200">
              <TabsTrigger value="history" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                <History className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                <BarChart3 className="w-3 h-3 mr-1" />
                Statistics
              </TabsTrigger>
              <TabsTrigger value="systems" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                <Gauge className="w-3 h-3 mr-1" />
                Systems
              </TabsTrigger>
            </TabsList>
            
            {/* History Tab */}
            <TabsContent value="history">
              {/* Recent Spins Visual */}
              <Card className="bg-white border-gray-200 shadow-sm mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Spins</CardTitle>
                  <CardDescription>Last 16 numbers entered</CardDescription>
                </CardHeader>
                <CardContent>
                  {totalSpins === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No spins recorded yet. Start entering numbers above!
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {spins.slice(-16).reverse().map((spin, idx) => (
                        <motion.div
                          key={`${spin.number}-${idx}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                            spin.number === 0 ? 'bg-green-600' :
                            isRed(spin.number) ? 'bg-red-600' : 'bg-zinc-800'
                          }`}>
                            {spin.number}
                          </div>
                          <DozenBadge dozen={spin.dozen} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prediction History Table - Like Original PHP */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-600" />
                        Danger Dozen Total Results
                      </CardTitle>
                      <CardDescription>Prediction history with WIN/MISS tracking</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-600">
                      Total: {history.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Enter at least 4 numbers to see prediction history
                    </div>
                  ) : (
                    <ScrollArea className="h-[800px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium text-xs">#</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium text-xs">Result</th>
                            <th className="text-center py-1.5 px-2 text-gray-500 font-medium text-xs">Trigger</th>
                            <th className="text-center py-1.5 px-2 text-gray-500 font-medium text-xs">Score</th>
                            <th className="text-left py-1.5 px-2 text-gray-500 font-medium text-xs">Explanation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...history].reverse().map((entry) => (
                            <motion.tr
                              key={entry.uniqueId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`border-b ${
                                entry.isWin 
                                  ? 'bg-green-50/50' 
                                  : 'bg-red-50/50'
                              }`}
                            >
                              <td className="py-1.5 px-2 text-gray-500 text-xs">{entry.uniqueId}</td>
                              <td className="py-1.5 px-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                  entry.result === 'wait' 
                                    ? 'bg-gray-100 text-gray-500'
                                    : entry.isWin 
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-red-100 text-red-700'
                                }`}
                                >
                                  {entry.isWin && <CheckCircle2 className="w-3 h-3" />}
                                  {!entry.isWin && entry.result !== 'wait' && <XCircle className="w-3 h-3" />}
                                  {entry.result}
                                </span>
                              </td>
                              <td className="text-center py-1.5 px-2">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${
                                  entry.triggerNumber === 0 ? 'bg-green-600' :
                                  isRed(entry.triggerNumber) ? 'bg-red-600' : 'bg-zinc-700'
                                }`}>
                                  {entry.triggerNumber}
                                </span>
                              </td>
                              <td className={`text-center py-1.5 px-2 font-bold text-sm ${
                                entry.totalNumber > 0 ? 'text-green-600' : entry.totalNumber < 0 ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                {entry.totalNumber}
                              </td>
                              <td className="py-1.5 px-2">
                                <div className={`text-xs px-2 py-1 rounded ${
                                  entry.isWin 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {entry.explanation}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dozen Distribution */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Dozen Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3].map(d => {
                      const count = dozenDist[d] || 0;
                      const total = totalSpins || 1;
                      const pct = (count / total) * 100;
                      return (
                        <div key={d} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <DozenBadge dozen={d} />
                              {DOZEN_LABELS[d]}
                            </span>
                            <span className="text-gray-500">{count} ({pct.toFixed(1)}%)</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                    {dozenDist[0] > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <DozenBadge dozen={0} />
                            Zero
                          </span>
                          <span className="text-gray-500">{dozenDist[0]}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Win Rate Progress */}
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">AI Accuracy Target</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`text-5xl font-bold ${
                          parseFloat(combinedWinRate) >= 90 ? 'text-green-600' :
                          parseFloat(combinedWinRate) >= 70 ? 'text-emerald-600' :
                          parseFloat(combinedWinRate) >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {combinedWinRate}%
                      </motion.div>
                      <p className="text-sm text-gray-500 mt-1">Combined Win Rate</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Target: 90%+</span>
                        <span>Current: {combinedWinRate}%</span>
                      </div>
                      <Progress 
                        value={Math.min(parseFloat(combinedWinRate), 100)} 
                        className={`h-4 ${
                          parseFloat(combinedWinRate) >= 90 ? '[&>div]:bg-green-500' :
                          parseFloat(combinedWinRate) >= 70 ? '[&>div]:bg-emerald-500' :
                          parseFloat(combinedWinRate) >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-green-600">{stats.combined.correct}</div>
                        <div className="text-xs text-gray-500">Wins</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-red-600">
                          {stats.combined.total - stats.combined.correct}
                        </div>
                        <div className="text-xs text-gray-500">Losses</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Systems Comparison Tab */}
            <TabsContent value="systems">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Comparison</CardTitle>
                  <CardDescription>Compare all 3 Danger Dozen systems + AI Combined</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-gray-500 font-medium">System</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Total</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Wins</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Win Rate</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Score</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Streak</th>
                          <th className="text-center py-2 px-3 text-gray-500 font-medium">Best</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'System 1', key: 'system1' as const, color: 'text-emerald-600', icon: '🛡️' },
                          { name: 'System 2', key: 'system2' as const, color: 'text-amber-600', icon: '⚔️' },
                          { name: 'System 3', key: 'system3' as const, color: 'text-rose-600', icon: '🏹' },
                          { name: 'AI Combined', key: 'combined' as const, color: 'text-purple-600', icon: '🧠' },
                        ].map(sys => {
                          const s = stats[sys.key];
                          const sc = scores[sys.key];
                          const wr = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0.0';
                          return (
                            <tr key={sys.key} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className={`py-2 px-3 font-medium ${sys.color}`}>
                                {sys.icon} {sys.name}
                              </td>
                              <td className="text-center py-2 px-3">{s.total}</td>
                              <td className="text-center py-2 px-3 text-green-600">{s.correct}</td>
                              <td className="text-center py-2 px-3">
                                <span className={`font-bold ${
                                  parseFloat(wr) >= 70 ? 'text-green-600' : parseFloat(wr) >= 50 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {wr}%
                                </span>
                              </td>
                              <td className={`text-center py-2 px-3 font-bold ${sc > 0 ? 'text-green-600' : sc < 0 ? 'text-red-600' : ''}`}>
                                {sc}
                              </td>
                              <td className="text-center py-2 px-3">
                                <span className={`flex items-center justify-center gap-1 ${
                                  s.streak > 0 ? 'text-green-600' : s.streak < 0 ? 'text-red-600' : ''
                                }`}>
                                  {s.streak > 0 && <Flame className="w-3 h-3" />}
                                  {s.streak < 0 && <Snowflake className="w-3 h-3" />}
                                  {s.streak}
                                </span>
                              </td>
                              <td className="text-center py-2 px-3 text-amber-600">{s.bestStreak}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Pattern Information */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" />
                How the AI System Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                <div className="space-y-2">
                  <h4 className="font-semibold text-emerald-600 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> 3 Danger Dozen Systems
                  </h4>
                  <p className="text-xs text-gray-500">
                    Each system uses a different mapping of dozen patterns to predictions. 
                    System 1 favors 1st dozen, System 2 favors 2nd, System 3 favors 3rd.
                    By combining all 3, we get broader coverage.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-600 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Pattern Detection
                  </h4>
                  <p className="text-xs text-gray-500">
                    BEEM (3 different dozens), Two-Dozen (2 consecutive different), 
                    Same-Dozen (2 consecutive same) patterns are detected and mapped
                    to predictions using the Danger Dozen algorithm.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-purple-600 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI Learning
                  </h4>
                  <p className="text-xs text-gray-500">
                    Markov chains track transition probabilities between patterns.
                    Frequency analysis detects &quot;due&quot; dozens. System weights adapt
                    based on recent performance. The more you play, the smarter it gets!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              Roulette AI Predictor — Danger Dozen System v2.0 + AI Pattern Learning
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> 3 Systems Active
              </span>
              <span className="flex items-center gap-1">
                <Brain className="w-3 h-3" /> AI Learning
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" /> {totalSpins} Spins
              </span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
