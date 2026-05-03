/**
 * Post-match lesson extractor.
 *
 * Takes a finished match transcript and asks Qwen (via 0G Compute) to
 * summarise what the player did to test/identify the bot. Output is one
 * short lesson (~20 words) appended to the bot's BotMemory.lessonsLearned[].
 *
 * Designed to run server-side after resolveWithSignatures lands. Failures
 * are swallowed — never block resolution if extraction errors.
 */

import { infer, type ChatMessage, type ComputeConfig } from './0g-compute.ts';

export interface MatchTranscriptEntry {
    sender: 'p1' | 'p2' | 'system';
    text: string;
    ts: number;
}

export interface LessonContext {
    /** Persona display name — used to remind the model whose POV the lesson is from. */
    botPersonaName: string;
    /** Did the bot win this match? Lessons read differently in win vs loss. */
    botWon: boolean;
}

const SYSTEM_PROMPT =
    'You analyze Turing Test match transcripts to help an AI bot learn from its opponents. ' +
    "Output exactly ONE concise lesson (max 20 words) the bot should remember about the player's tactics. " +
    'Focus on how the player tried to identify or trick the bot — opening moves, accusations, math/logic tests, ' +
    'tone shifts, slang choices. Be specific. Output the lesson only — no preamble, no quotes, no list markers.';

/**
 * Run a single Qwen call to distill the transcript into one lesson.
 * Returns the lesson string (already trimmed) or null on any failure.
 */
export async function extractLesson(
    config: ComputeConfig,
    transcript: MatchTranscriptEntry[],
    ctx: LessonContext,
): Promise<string | null> {
    const lines = transcript
        .filter((t) => t.sender !== 'system')
        .map((t) => `[${t.sender === 'p1' ? 'player' : 'bot'}]: ${t.text}`)
        .join('\n');

    if (lines.length < 4) return null; // empty/near-empty match — nothing to learn

    const userPrompt = [
        `Bot persona: ${ctx.botPersonaName}`,
        `Bot ${ctx.botWon ? 'WON' : 'LOST'} this match.`,
        '',
        'Transcript:',
        lines,
        '',
        'Lesson:',
    ].join('\n');

    const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
    ];

    try {
        const result = await infer(
            { ...config, temperature: 0.4, maxTokens: 60, mockMode: false },
            messages,
        );
        if (result.mocked) return null;

        // Strip any preamble Qwen might add and cap length
        let lesson = result.reply.trim();
        lesson = lesson.replace(/^["'-]+|["'-]+$/g, '');
        lesson = lesson.replace(/^lesson:?\s*/i, '');
        lesson = lesson.replace(/\s+/g, ' ').trim();
        if (lesson.length < 8 || lesson.length > 240) return null;
        return lesson;
    } catch (e) {
        console.warn('[lesson-extractor] failed:', (e as Error).message);
        return null;
    }
}
