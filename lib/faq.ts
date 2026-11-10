/*
Static FAQ copy for the pages that have no per-title data (home, list
pages, About). Per-title FAQs come from the generated guide content instead.
*/

import type { FaqItem } from "@/components/ui/Faq";

/*
Homepage FAQ: the "anime girl" questions people search (wallpapers, drawing,
cutest characters), then the site questions. Rendered once by <Faq>, which
emits a single FAQPage JSON-LD block for the page; keep it to one FAQ per page.
Answers must stay true to what the site offers (e.g. wallpapers are HD,
phone-sized, not 4K/8K).
*/
export const ANIME_GIRL_FAQ: FaqItem[] = [
  {
    q: "Who is the best anime girl?",
    a: "There is no single winner, but fan favourite counts on AniList keep a few names near the top: Zero Two from Darling in the FRANXX, Mikasa Ackerman from Attack on Titan, Rem from Re:Zero and Makima from Chainsaw Man. Each wins for a different reason: Zero Two for her style, Mikasa for her loyalty and strength, Rem for her devotion, Makima for being unforgettable. Browse the most loved anime characters on Animegirl4u to see the full ranking.",
  },
  {
    q: "Who are the 10 cutest anime characters?",
    a: "A popular top 10 of cute anime girls: Anya Forger (Spy x Family), Nezuko Kamado (Demon Slayer), Rem (Re:Zero), Marin Kitagawa (My Dress-Up Darling), Megumin (KonoSuba), Chika Fujiwara (Kaguya-sama: Love Is War), Hinata Hyuga (Naruto), Mai Sakurajima (Rascal Does Not Dream of Bunny Girl Senpai), Zero Two (Darling in the FRANXX) and Frieren (Frieren: Beyond Journey's End). Cute is personal, so treat it as a starting point.",
  },
  {
    q: "What are some cute girly anime?",
    a: "For soft, cute and girly vibes try K-On!, Laid-Back Camp, Bocchi the Rock!, Komi Can't Communicate, My Dress-Up Darling and Spy x Family. If you want cute plus romance, Kaguya-sama: Love Is War, Horimiya and Toradora! are easy favourites.",
  },
  {
    q: "Why are anime girls so cute?",
    a: "Anime character design leans on big expressive eyes, small noses and mouths, soft rounded faces and bright hair colours. Those features read as youthful and friendly, and they make emotions easy to see at a glance. Add exaggerated reactions like blushing, pouting or sparkling eyes and you get the cute look anime is famous for.",
  },
  {
    q: "Do you like big girls anime?",
    a: "If you mean tall, strong heroines, anime has plenty: Mikasa Ackerman in Attack on Titan, Maki Zen'in in Jujutsu Kaisen and Erza Scarlet in Fairy Tail are fan favourites because they are powerful, confident and carry their own stories. Anime has room for every body type, and many of the best-loved characters are the ones who break the usual mould.",
  },
  {
    q: "How to draw cute anime girls?",
    a: "Start with a circle for the head and add a soft, short jawline. Place the eyes about halfway down the face and make them large, with a big pupil and one or two white highlights. Keep the nose a small dot or line and the mouth small. Draw the hair in big clumps rather than single strands, then add a blush on the cheeks. Copying finished sketches is the fastest way to learn, so use the anime girl sketch wallpapers on Animegirl4u as practice references.",
  },
  {
    q: "Cute anime girl drawing: what makes it look cute?",
    a: "Proportions do most of the work: a slightly bigger head, larger eyes set lower on the face, a small chin and short limbs all read as cute. Rounded shapes, a gentle smile or a wink, hair clips and ribbons, and soft blush lines finish the look.",
  },
  {
    q: "Cute anime girl easy: what is the simplest way to start?",
    a: "Draw a chibi. Make the head about as big as the body, give it two large oval eyes with highlights, a tiny mouth and a simple fringe of hair. Chibi drawings forgive mistakes and look cute almost straight away, which makes them perfect for beginners.",
  },
  {
    q: "Where can I get an anime girl wallpaper in 4K?",
    a: "A true 4K wallpaper is 3840 x 2160 pixels. The wallpapers on Animegirl4u are free HD images sized for phones and tablets (up to about 1,670 pixels on the long side), not 4K, and each one lists its exact size before you download. Avoid stretching a small image to 4K, as it will look soft.",
  },
  {
    q: "Anime girl wallpaper 8K: does it exist?",
    a: "8K wallpapers (7680 x 4320 pixels) are rare and only make sense on 8K screens. Most phones and laptops display 1080p to 4K, so a sharp HD or 4K image looks the same there. Animegirl4u offers HD phone wallpapers, not 8K.",
  },
  {
    q: "What is a good anime girl wallpaper 4K for phone?",
    a: "Phones are tall, so pick a portrait wallpaper. Most phone screens are around 1080 x 2400 pixels, which means a sharp portrait image of that size looks great without being 4K. The portrait wallpapers on Animegirl4u are made for exactly that.",
  },
  {
    q: "Where can I find a cute anime wallpaper girl?",
    a: "Browse the Sketch collection for soft pencil-drawn cute anime girls, or the Lo-fi and Fox Spirit collections for cosy, gentle art. Every wallpaper is free to download.",
  },
  {
    q: "Where can I find a cool anime wallpaper girl?",
    a: "For cool and edgy looks, try the Cyberpunk collection (neon cities and holograms), Gothic (lace, roses and cathedral windows) or Crazy (wild punk energy). For heroic art, the Fantasy collection has mages, knights and dragon riders.",
  },
  {
    q: "What is the most beautiful anime girl wallpaper?",
    a: "Beauty is personal, but the most-saved styles tend to be detailed fantasy art and moody gothic portraits. Start with the Fantasy collection, where scenes like the Moonlight Mage and the Luminous Fairy show off rich colour and lighting.",
  },
];

export const HOME_FAQ: FaqItem[] = [
  {
    q: "What is an ending explained guide?",
    a: "It is a plain-English breakdown of how a movie or anime ends: a short recap, exactly what happens in the final scenes, what the ending means, and answers to the questions people ask most after watching.",
  },
  {
    q: "Are the guides full of spoilers?",
    a: "Recaps are labeled spoiler-light. The ending explanation is spoiler-forward and hidden behind a reveal control, so you can stop before the spoilers.",
  },
  {
    q: "What is a watch order guide?",
    a: "It lists every entry in a franchise in the order that makes sense to watch them, and notes where release order and story order differ so you do not spoil yourself or get lost.",
  },
  {
    q: "Should I watch a franchise in release order or story order?",
    a: "For most first-time viewers, release order is safest because reveals land the way the creators intended. Each watch order guide says when a different order works better and why.",
  },
  {
    q: "How are the guides written?",
    a: "Ending explanations are AI-assisted using catalog facts and must pass a minimum-length check before publication. Watch order guides are drafted from catalog data and stay unpublished until a person reviews them.",
  },
  {
    q: "Do I need an account to use Animegirl4u?",
    a: "No. You can read every guide, like titles, and save titles to your browser without signing up.",
  },
  {
    q: "Can't find the title you are looking for?",
    a: "Search by title to check for an existing guide. If it is not here yet, send a title request using the form below.",
  },
];

export const ENDING_INDEX_FAQ: FaqItem[] = [
  {
    q: "How do I find the ending explained for a specific movie or anime?",
    a: "Use the search box at the top of this page or on the search page. Type the title and open the guide from the results.",
  },
  {
    q: "What does each guide include?",
    a: "A recap, how the story ends, the themes and meaning, an FAQ, quick facts, where to watch, and the cast, all on one page.",
  },
  {
    q: "Do the guides cover both movies and anime?",
    a: "Yes. Use the All, Movies and Anime filters above the list to narrow what you see.",
  },
  {
    q: "Where should I start if I have not seen the whole franchise?",
    a: "Read the franchise's watch order guide first, then come back to the ending explained guides once you have watched each entry.",
  },
];

export const WATCH_ORDER_INDEX_FAQ: FaqItem[] = [
  {
    q: "Should I watch in release order or story order?",
    a: "For most franchises release order is safest because it keeps surprises intact. Each guide explains when a different order gives a better experience and why.",
  },
  {
    q: "What is the difference between release, chronological and recommended order?",
    a: "Release order follows when each entry came out. Chronological order follows the in-story timeline. Recommended order is the editor's suggestion for the best first-time experience.",
  },
  {
    q: "Do I have to watch every entry?",
    a: "Not always. Each guide's notes explain how each entry fits, so you can see what is essential before you decide to skip anything.",
  },
  {
    q: "How are watch orders checked?",
    a: "They are drafted with AI from catalog data and stay hidden until a person has reviewed and approved them, since a wrong order can spoil a story.",
  },
];

export const ABOUT_FAQ: FaqItem[] = [
  {
    q: "What is Animegirl4u?",
    a: "Animegirl4u is an independent anime fan site. It offers free original anime girl GIFs, stickers and wallpapers, profiles of popular and trending anime characters, browser mini-games, ending explained guides and franchise watch orders.",
  },
  {
    q: "Are the GIFs and wallpapers free to download?",
    a: "Yes. Every GIF, sticker and wallpaper is free and downloads directly from Animegirl4u, with no sign-up and no redirect to another app. They are original images made for the site and are meant for personal use, such as chats, profile pictures and phone backgrounds.",
  },
  {
    q: "Is Animegirl4u affiliated with any anime studio?",
    a: "No. Animegirl4u is an independent fan site and is not affiliated with any studio, publisher or streaming service. Anime titles and characters belong to their respective owners.",
  },
  {
    q: "Where does the character information come from?",
    a: "Character profiles use AniList data for names, appearances and voice actors. Overviews are written to be spoiler-free.",
  },
  {
    q: "Are ending explained guides spoiler-free?",
    a: "No. Guides discuss the ending directly. The ending section sits behind a spoiler control so you choose when to reveal it.",
  },
  {
    q: "Do the guides explain what an ending means?",
    a: "Yes, where the story supports a clear reading. When an ending is open to interpretation, the guide separates what the story shows from what viewers may take from it.",
  },
  {
    q: "Are the guides written by AI?",
    a: "AI helps draft ending explanations from catalog facts, and each guide must pass a minimum-length check before publication. Watch orders stay unpublished until a person reviews and approves them.",
  },
  {
    q: "Do I need an account?",
    a: "No. Likes and saved titles are stored in your own browser. Comments are open without signing up and are moderated.",
  },
  {
    q: "Where does the movie and anime data come from?",
    a: "Movie details and cast come from TMDB, and anime details come from public anime databases. Guide text is written on top of that data.",
  },
  {
    q: "How can I report a mistake in a guide?",
    a: "Leave a comment on the guide page describing what is wrong. Comments are reviewed and guides are corrected when needed.",
  },
  {
    q: "How do I request a title that is missing?",
    a: "Use the Request an Ending form on the home page. Requests are reviewed and considered for future guides.",
  },
];
