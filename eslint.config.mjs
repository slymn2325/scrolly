import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const cikTokenPlugin = {
  rules: {
    'no-raw-palette': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Ban bg-white, text-slate-*, dark:text-*, and raw hex outside token definitions.',
        },
        schema: [],
        messages: {
          banned:
            'Use semantic cik tokens. bg-white, text-slate-*, dark:text-*, and raw hex are not allowed in components.',
        },
      },
      create(context) {
        const banned =
          /(?:^|[\s"'`])(?:bg-white\b|text-slate-|dark:text-)|#(?:[0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3,4})\b/;
        const check = (raw, node) => {
          if (typeof raw !== 'string' || raw.length === 0) return;
          if (banned.test(raw)) context.report({ node, messageId: 'banned' });
        };
        return {
          Literal(node) {
            if (typeof node.value === 'string') check(node.value, node);
          },
          TemplateElement(node) {
            check(node.value.raw, node);
          },
        };
      },
    },
  },
};

/**
 * Legacy screens still carry the pre-Çıkartma palette. W1–W9 own those files.
 * The ban applies to every other file under components/, including components/cikartma.
 */
const LEGACY_PALETTE_FILES = [
  'components/InteractiveSketchArt.tsx',
  'components/LazyAuthPrompt.tsx',
  'components/LeaderboardModal.tsx',
  'components/MemoryQuizCard.tsx',
  'components/MiniOnboardingHint.tsx',
  'components/ContactInteractiveSection.tsx',
  'components/CookieBanner.tsx',
  'components/DailySprintLanding.tsx',
  'components/DesktopFeedSideRail.tsx',
  'components/DiplomaProfileModal.tsx',
  'components/DuelInviteLanding.tsx',
  'components/DuelModal.tsx',
  'components/FloatingBackground.tsx',
  'components/FullBleedReelsCanvas.tsx',
  'components/GiphyReactionPicker.tsx',
  'components/GuessWidget.tsx',
  'components/HomeClient.tsx',
  'components/sketch/ScienceWeirdSketches.tsx',
  'components/sketch/SketchPrimitives.tsx',
  'components/sketch/SpaceNatureSketches.tsx',
  'components/BrandLogo.tsx',
  'components/CategoryMotionArt.tsx',
  'components/QuizHubModal.tsx',
  'components/QuizSectionSwitch.tsx',
  'components/ShareResultModal.tsx',
  'components/StickyAdBanner.tsx',
  'components/StoryShareModal.tsx',
  'components/TikTokFactSlide.tsx',
  'components/TikTokFeed.tsx',
  'components/TopicRadarChart.tsx',
  'components/sketch/BodyHistorySketches.tsx',
  'components/NativeAdSlide.tsx',
  'components/PoweredByGiphyBadge.tsx',
  'components/PrivacyPolicyView.tsx',
  'components/ProfileHeaderTools.tsx',
  'components/PwaInstallGuideModal.tsx',
  'components/QuizCtaSlide.tsx',
];

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'public/sw.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      globals: {
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.{cjs,mjs,js}'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Buffer: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['components/**/*.{ts,tsx}'],
    ignores: LEGACY_PALETTE_FILES,
    plugins: { cik: cikTokenPlugin },
    rules: {
      'cik/no-raw-palette': 'error',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  }
);
