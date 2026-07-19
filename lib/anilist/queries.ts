/** Reusable GraphQL fragments + queries for the AniList API. */

export const MEDIA_SUMMARY_FIELDS = /* GraphQL */ `
  fragment MediaSummaryFields on Media {
    id
    type
    format
    status
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    averageScore
    meanScore
    popularity
    favourites
    episodes
    chapters
    volumes
    duration
    season
    seasonYear
    genres
    isAdult
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
  }
`;

/**
 * Single combined homepage query. AniList's rate limit is only ~30 req/min,
 * so we fetch every rail + the hero in ONE aliased request (1 rate-limit unit)
 * instead of nine separate calls.
 */
export const HOME_QUERY = /* GraphQL */ `
  ${MEDIA_SUMMARY_FIELDS}
  query Home($season: MediaSeason, $year: Int) {
    heroTrending: Page(page: 1, perPage: 4) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
        ...MediaSummaryFields
        description(asHtml: false)
      }
    }
    heroPopular: Page(page: 1, perPage: 3) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
        ...MediaSummaryFields
        description(asHtml: false)
      }
    }
    heroTop: Page(page: 1, perPage: 3) {
      media(type: ANIME, sort: SCORE_DESC, isAdult: false) {
        ...MediaSummaryFields
        description(asHtml: false)
      }
    }
    heroSeason: Page(page: 1, perPage: 3) {
      media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) {
        ...MediaSummaryFields
        description(asHtml: false)
      }
    }
    trendingAnime: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    seasonAnime: Page(page: 1, perPage: 20) {
      media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) {
        ...MediaSummaryFields
      }
    }
    popularAnime: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    topAnime: Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: SCORE_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    trendingManga: Page(page: 1, perPage: 20) {
      media(type: MANGA, sort: TRENDING_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    popularManga: Page(page: 1, perPage: 20) {
      media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    topManga: Page(page: 1, perPage: 20) {
      media(type: MANGA, sort: SCORE_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    lightNovels: Page(page: 1, perPage: 20) {
      media(type: MANGA, format: NOVEL, sort: POPULARITY_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    trendingNovels: Page(page: 1, perPage: 20) {
      media(type: MANGA, format: NOVEL, sort: TRENDING_DESC, isAdult: false) { ...MediaSummaryFields }
    }
    topNovels: Page(page: 1, perPage: 20) {
      media(type: MANGA, format: NOVEL, sort: SCORE_DESC, isAdult: false) { ...MediaSummaryFields }
    }
  }
`;

/** Generic paged browse query — powers Discover and homepage rails. */
export const BROWSE_QUERY = /* GraphQL */ `
  ${MEDIA_SUMMARY_FIELDS}
  query Browse(
    $page: Int = 1
    $perPage: Int = 20
    $type: MediaType
    $sort: [MediaSort]
    $search: String
    $season: MediaSeason
    $seasonYear: Int
    $format: MediaFormat
    $format_in: [MediaFormat]
    $status: MediaStatus
    $genre_in: [String]
    $genre_not_in: [String]
    $tag_in: [String]
    $tag_not_in: [String]
    $averageScore_greater: Int
    $startDate_greater: FuzzyDateInt
    $startDate_lesser: FuzzyDateInt
    $isAdult: Boolean = false
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      media(
        type: $type
        sort: $sort
        search: $search
        season: $season
        seasonYear: $seasonYear
        format: $format
        format_in: $format_in
        status: $status
        genre_in: $genre_in
        genre_not_in: $genre_not_in
        tag_in: $tag_in
        tag_not_in: $tag_not_in
        averageScore_greater: $averageScore_greater
        startDate_greater: $startDate_greater
        startDate_lesser: $startDate_lesser
        isAdult: $isAdult
      ) {
        ...MediaSummaryFields
      }
    }
  }
`;

/**
 * AniList's canonical genre + tag vocabulary. Fetched server-side and cached;
 * used to build the Discover filter controls dynamically.
 */
export const TAXONOMY_QUERY = /* GraphQL */ `
  query Taxonomy {
    GenreCollection
    MediaTagCollection {
      name
      category
      isAdult
      isGeneralSpoiler
    }
  }
`;

export const MEDIA_DETAIL_QUERY = /* GraphQL */ `
  ${MEDIA_SUMMARY_FIELDS}
  query MediaDetail($id: Int) {
    Media(id: $id) {
      ...MediaSummaryFields
      description(asHtml: false)
      source
      countryOfOrigin
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      trailer {
        id
        site
      }
      studios(sort: FAVOURITES_DESC) {
        nodes {
          id
          name
          isAnimationStudio
        }
      }
      tags {
        id
        name
        rank
        isMediaSpoiler
      }
      characters(sort: [ROLE, FAVOURITES_DESC], perPage: 12) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
          voiceActors(language: JAPANESE, sort: FAVOURITES_DESC) {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
      staff(sort: RELEVANCE, perPage: 8) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            ...MediaSummaryFields
          }
        }
      }
      recommendations(sort: RATING_DESC, perPage: 12) {
        nodes {
          mediaRecommendation {
            ...MediaSummaryFields
          }
        }
      }
    }
  }
`;

/**
 * Batched metadata refresh for titles already in the user's library. Fetches
 * only the AniList-owned fields a snapshot can go stale on, for up to 50 ids
 * per request (AniList's `perPage` ceiling) — never one request per title.
 */
export const LIBRARY_REFRESH_QUERY = /* GraphQL */ `
  query LibraryRefresh($ids: [Int], $perPage: Int = 50) {
    Page(page: 1, perPage: $perPage) {
      media(id_in: $ids) {
        id
        type
        format
        status
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        episodes
        chapters
        volumes
        seasonYear
        averageScore
        nextAiringEpisode {
          airingAt
          episode
        }
      }
    }
  }
`;

/** Airing schedule window — powers the Calendar page. */
export const AIRING_QUERY = /* GraphQL */ `
  query Airing($start: Int, $end: Int, $page: Int = 1, $perPage: Int = 50) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
      }
      airingSchedules(
        airingAt_greater: $start
        airingAt_lesser: $end
        sort: TIME
      ) {
        id
        airingAt
        episode
        media {
          id
          type
          format
          isAdult
          title {
            romaji
            english
          }
          coverImage {
            large
            color
          }
          averageScore
        }
      }
    }
  }
`;
