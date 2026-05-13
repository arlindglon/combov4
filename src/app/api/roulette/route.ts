import { NextRequest, NextResponse } from 'next/server';
import { RouletteEngine } from '@/lib/roulette/engine';
import { getDozen } from '@/lib/roulette/types';

// In-memory engine storage per session
const engines = new Map<string, RouletteEngine>();

function getOrCreateEngine(sessionId: string): RouletteEngine {
  if (!engines.has(sessionId)) {
    engines.set(sessionId, new RouletteEngine());
  }
  return engines.get(sessionId)!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, number, numbers, sessionId } = body;

    const sid = sessionId || 'default';
    const engine = getOrCreateEngine(sid);

    switch (action) {
      case 'addSpin': {
        if (typeof number !== 'number' || number < 0 || number > 36) {
          return NextResponse.json({ error: 'Invalid number. Must be 0-36.' }, { status: 400 });
        }

        const result = engine.addSpin(number);
        const spins = engine.getSpins();
        const scores = engine.getScores();
        const stats = engine.getStats();
        const dozenDist = engine.getDozenDistribution();

        return NextResponse.json({
          success: true,
          prediction: result.prediction,
          previousResult: result.previousResult || null,
          spins: spins.slice(-20),
          totalSpins: spins.length,
          scores,
          stats,
          dozenDistribution: dozenDist,
          recentWinRate: engine.getRecentWinRate(),
          history: engine.getHistory(),
        });
      }

      case 'addBulkSpins': {
        if (!Array.isArray(numbers) || numbers.length === 0) {
          return NextResponse.json({ error: 'Invalid numbers array.' }, { status: 400 });
        }

        const results = [];
        for (const num of numbers) {
          if (typeof num === 'number' && num >= 0 && num <= 36) {
            const result = engine.addSpin(num);
            results.push({
              number: num,
              dozen: getDozen(num),
              prediction: result.prediction,
              previousResult: result.previousResult || null,
            });
          }
        }

        const spins = engine.getSpins();
        const scores = engine.getScores();
        const stats = engine.getStats();

        return NextResponse.json({
          success: true,
          results,
          spins: spins.slice(-20),
          totalSpins: spins.length,
          scores,
          stats,
          dozenDistribution: engine.getDozenDistribution(),
          recentWinRate: engine.getRecentWinRate(),
          history: engine.getHistory(),
        });
      }

      case 'undo': {
        const undone = engine.undoLastSpin();
        const spins = engine.getSpins();
        return NextResponse.json({
          success: undone,
          spins: spins.slice(-20),
          totalSpins: spins.length,
          scores: engine.getScores(),
          stats: engine.getStats(),
          dozenDistribution: engine.getDozenDistribution(),
          history: engine.getHistory(),
        });
      }

      case 'clear': {
        engines.delete(sid);
        const freshEngine = getOrCreateEngine(sid);
        return NextResponse.json({
          success: true,
          spins: [],
          totalSpins: 0,
          scores: freshEngine.getScores(),
          stats: freshEngine.getStats(),
          dozenDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
          history: [],
        });
      }

      case 'getState': {
        const spins = engine.getSpins();
        const lastPred = engine.getLastPredictions();
        return NextResponse.json({
          spins: spins.slice(-20),
          totalSpins: spins.length,
          scores: engine.getScores(),
          stats: engine.getStats(),
          lastPrediction: lastPred,
          dozenDistribution: engine.getDozenDistribution(),
          recentWinRate: engine.getRecentWinRate(),
          history: engine.getHistory(),
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Roulette API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Roulette AI Prediction Engine is running',
    version: '2.0',
  });
}
