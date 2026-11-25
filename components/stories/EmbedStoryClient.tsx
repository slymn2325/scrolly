'use client';

import React, { useCallback } from 'react';
import ScrollyStoryPlayer from '@/components/stories/ScrollyStoryPlayer';
import type { StoryRecord } from '@/types/story';

interface EmbedStoryClientProps {
  story: StoryRecord;
}

export default function EmbedStoryClient({ story }: EmbedStoryClientProps) {
  const handleCompleteStory = useCallback(() => {
    void fetch(`/api/stories/${encodeURIComponent(story.id)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {});
  }, [story.id]);

  return (
    <main className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-cik-bg p-1.5 sm:p-3">
      <div className="h-full w-full max-w-[460px]">
        <ScrollyStoryPlayer
          storyId={story.id}
          title={story.title}
          sourceUrl={story.sourceUrl}
          language={story.language}
          theme={story.theme}
          cards={story.cards}
          onCompleteStory={handleCompleteStory}
        />
      </div>
    </main>
  );
}
