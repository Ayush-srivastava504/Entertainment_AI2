/*
Which topic hubs have enough content to be indexed.

A topic hub with one or two guides is a thin list page. Before this, every
topic was in the sitemap once the site had 10 guides in total, whatever the
topic itself held. Now the page and the sitemap use the same rule: below the
minimum, the hub is noindex, follow and left out of the sitemap. It indexes
again automatically once enough matching guides are published.

Counts use the strict queries: a database error must never look like
"0 guides", or one blip would stamp noindex on a good hub and cache it.
When the count is unknown the page stays indexable, and the sitemap
request fails (503, retried) instead of silently dropping the hubs.
*/

import { getRecentPublishedAnime } from "@/lib/api/anime";
import { getAllPublishedFranchises, type Franchise } from "@/lib/api/franchises";
import { ENDING_TOPICS, WATCH_ORDER_TOPICS, matchesFranchiseTopic, matchesMediaTopic, type GuideTopic } from "@/lib/topics";
import type { MediaItem } from "@/lib/api/normalize";

export const MIN_ENDING_TOPIC_GUIDES = 6;
export const MIN_WATCH_ORDER_TOPIC_GUIDES = 3;

// The ending topic pages list matches from the most recent 120 guides.
const ENDING_TOPIC_POOL = 120;

/** Guides shown on an ending topic page (soft: [] on DB error, page still renders). */
export async function getEndingTopicItems(topic: GuideTopic): Promise<MediaItem[]> {
  const anime = await getRecentPublishedAnime(ENDING_TOPIC_POOL);
  return anime.filter((item) => matchesMediaTopic(item, topic));
}

/** Franchises shown on a watch-order topic page (soft: [] on DB error). */
export async function getWatchOrderTopicItems(topic: GuideTopic): Promise<Franchise[]> {
  return (await getAllPublishedFranchises()).filter((franchise) => matchesFranchiseTopic(franchise, topic));
}

/** True only when the topic is known to be below the minimum; false if unknown. */
export async function isThinEndingTopic(topic: GuideTopic): Promise<boolean> {
  try {
    const anime = await getRecentPublishedAnime(ENDING_TOPIC_POOL, { strict: true });
    return anime.filter((item) => matchesMediaTopic(item, topic)).length < MIN_ENDING_TOPIC_GUIDES;
  } catch {
    return false;
  }
}

/** True only when the topic is known to be below the minimum; false if unknown. */
export async function isThinWatchOrderTopic(topic: GuideTopic): Promise<boolean> {
  try {
    const franchises = await getAllPublishedFranchises(200, { strict: true });
    return franchises.filter((f) => matchesFranchiseTopic(f, topic)).length < MIN_WATCH_ORDER_TOPIC_GUIDES;
  } catch {
    return false;
  }
}

/** True only when there are known to be no published watch orders. */
export async function isWatchOrderHubEmpty(): Promise<boolean> {
  try {
    return (await getAllPublishedFranchises(200, { strict: true })).length === 0;
  } catch {
    return false;
  }
}

/** Topics with enough guides to index. Throws on DB error (callers decide). */
export async function getIndexableEndingTopics(): Promise<GuideTopic[]> {
  const anime = await getRecentPublishedAnime(ENDING_TOPIC_POOL, { strict: true });
  return ENDING_TOPICS.filter((t) => anime.filter((item) => matchesMediaTopic(item, t)).length >= MIN_ENDING_TOPIC_GUIDES);
}

/** Topics with enough guides to index. Throws on DB error (callers decide). */
export async function getIndexableWatchOrderTopics(): Promise<GuideTopic[]> {
  const franchises = await getAllPublishedFranchises(200, { strict: true });
  return WATCH_ORDER_TOPICS.filter((t) => franchises.filter((f) => matchesFranchiseTopic(f, t)).length >= MIN_WATCH_ORDER_TOPIC_GUIDES);
}
