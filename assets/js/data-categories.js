/* Vendor categories — sourced from Vivek's Google Sheet, 2 Aug 2026.
   `c` = Instagram shortcode, `k` = reel|p|profile, `n` = your note from the sheet.
   SCRAPED holds account details pulled per shortcode; shared across categories. */

const CATEGORIES = {
 "mua": {
  "title": "Makeup & Hair",
  "icon": "💄",
  "nav": "MUA & Hair",
  "desc": "Makeup artists and hair stylists. Book early — the good ones take one wedding per date, and you'll want a trial first.",
  "links": [
   {
    "c": "DVaO8aDCkS3",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTMuwmHjOsM",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DUkOZdZDK0w",
    "k": "p",
    "n": ""
   },
   {
    "c": "DVJJowtDL-M",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTSz5ieDL_R",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DMLlBYUNGZz",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTQVAFIgece",
    "k": "p",
    "n": ""
   },
   {
    "c": "DPt0y55jCQW",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DQCQ6opgdUH",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DP3DAFvjAve",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DO5TJ8EjTRF",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C4XFr_3o3Nt",
    "k": "p",
    "n": ""
   },
   {
    "c": "C8D7WetyM-4",
    "k": "p",
    "n": ""
   },
   {
    "c": "DIs8eIeI9ki",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DIJaUMlBJO-",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DH01HwitLQt",
    "k": "p",
    "n": ""
   },
   {
    "c": "C_Nc64FMw0k",
    "k": "p",
    "n": ""
   },
   {
    "c": "DG7_PQkscAv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DCgt64soj4Q",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGcaSmozwzx",
    "k": "p",
    "n": ""
   },
   {
    "c": "DEmCTucN7fl",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DFNZ6HLNEI7",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DF2BxsoywHB",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DE2C6Axx8nG",
    "k": "p",
    "n": ""
   },
   {
    "c": "DERxirUy3b5",
    "k": "p",
    "n": ""
   },
   {
    "c": "DDzNxHDttS1",
    "k": "p",
    "n": ""
   },
   {
    "c": "C-p2t-fvriv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C99h6NFtoYD",
    "k": "p",
    "n": ""
   },
   {
    "c": "C8XV91IvbCm",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C8SMgjvv_sY",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DCmddYVtAsb",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C4xNn0NITyU",
    "k": "p",
    "n": ""
   },
   {
    "c": "C8JGTOkIEpR",
    "k": "p",
    "n": ""
   },
   {
    "c": "C8UJNU0Sqeg",
    "k": "reel",
    "n": ""
   }
  ]
 },
 "photographers": {
  "title": "Photography & Film",
  "icon": "📷",
  "nav": "Photo & Film",
  "desc": "Photographers and videographers. Along with the planner, this is the vendor you live with all day — personality fit matters as much as the portfolio.",
  "links": [
   {
    "c": "DWHKNF4jPHL",
    "k": "p",
    "n": ""
   },
   {
    "c": "C6ZDv1sN1XH",
    "k": "p",
    "n": ""
   },
   {
    "c": "DUBcaxZjt1M",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DT7hEyCCKup",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTSz5ieDL_R",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DMPCdHhOd3O",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DRR5mAOkt0s",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DP3DAFvjAve",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DMzpGqMKRVv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGSzlViyD-c",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DHIuBYktQub",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DJRfborz3v5",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DIq8yZPzCeg",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DIDTzSyId6p",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DHClDySppNa",
    "k": "p",
    "n": ""
   },
   {
    "c": "Cg1hAqIKiPG",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DG7_PQkscAv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DFaYEqiycdD",
    "k": "p",
    "n": ""
   },
   {
    "c": "DE2C6Axx8nG",
    "k": "p",
    "n": ""
   },
   {
    "c": "C73fRkFp-Nw",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C-p2t-fvriv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C1yzSBGtZIW",
    "k": "p",
    "n": ""
   },
   {
    "c": "C74D3YCyFbl",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C3uYrqyIxFk",
    "k": "p",
    "n": ""
   },
   {
    "c": "C22T3nexm9S",
    "k": "p",
    "n": ""
   },
   {
    "c": "Cudo9zkJS4B",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C06nO4wsa8B",
    "k": "reel",
    "n": ""
   },
   {
    "c": "Cx3G9xVpcCo",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DJbtTv-yUZO",
    "k": "reel",
    "n": "Photo inspiration"
   },
   {
    "c": "DI8JzlnTEnG",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C0rLze8tIvB",
    "k": "reel",
    "n": ""
   }
  ]
 },
 "choreographers": {
  "title": "Choreographers",
  "icon": "💃",
  "nav": "Choreo",
  "desc": "Sangeet choreography. Lock this by early November — rehearsal schedules with family need real lead time.",
  "links": [
   {
    "c": "DVGukuwDaVT",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C6ZDv1sN1XH",
    "k": "p",
    "n": ""
   },
   {
    "c": "DUktGrBCJpo",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DSc03vGkv3w",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTyGix8jPBN",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DUDvB45k65s",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTP7HoZjR6-",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DNspXoAaLoa",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DP3DAFvjAve",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DH5HJFWx33g",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DHjYxJGztOg",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGSzlViyD-c",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DHWGZXty9FY",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DFaYEqiycdD",
    "k": "p",
    "n": ""
   },
   {
    "c": "DEssGCzzeVY",
    "k": "reel",
    "n": ""
   },
   {
    "c": "ClFynGyDuda",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DEmZPJsS6XV",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C-o5BPjvV5S",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C9KQEhgNsoQ",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C5GTtfQSkZ4",
    "k": "reel",
    "n": ""
   },
   {
    "c": "CzEECvqoSIx",
    "k": "reel",
    "n": ""
   },
   {
    "c": "CzB7t0xvpCS",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C2KaZd0oe1u",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C2Czwq4vOR1",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C0mJ1B_CTxb",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C06nO4wsa8B",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C0irqeboBCK",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGvo5sxoOdS",
    "k": "reel",
    "n": ""
   },
   {
    "c": "CzbA2qLI0MU",
    "k": "reel",
    "n": ""
   },
   {
    "c": "Cx3G9xVpcCo",
    "k": "reel",
    "n": ""
   },
   {
    "c": "Cx-GU8Vo2wK",
    "k": "reel",
    "n": ""
   }
  ]
 },
 "music": {
  "title": "Live Music, DJ & Anchors",
  "icon": "🎤",
  "nav": "Music & DJ",
  "desc": "DJs, live singers, flautists and anchors. Check the venue's noise curfew before booking anything loud — Khandala is a hill station.",
  "links": [
   {
    "c": "DWZMlBkEUkZ",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C6ZDv1sN1XH",
    "k": "p",
    "n": "Anchor, DJ, flautist"
   },
   {
    "c": "DVJJowtDL-M",
    "k": "reel",
    "n": "Anchor"
   },
   {
    "c": "DT-absUiHkS",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DTSz5ieDL_R",
    "k": "reel",
    "n": "DJ"
   },
   {
    "c": "DMzpGqMKRVv",
    "k": "reel",
    "n": "DJ"
   },
   {
    "c": "DMANiPONMji",
    "k": "p",
    "n": ""
   },
   {
    "c": "DHa9VDzCOz1",
    "k": "reel",
    "n": "DJ"
   },
   {
    "c": "Cu1vjxkp7Iz",
    "k": "reel",
    "n": "Singer — Shemay Shah"
   },
   {
    "c": "C0lzgx2q5LV",
    "k": "reel",
    "n": "Anchor"
   },
   {
    "c": "CtrMi1nuRJU",
    "k": "reel",
    "n": "Anchor"
   },
   {
    "c": "anchorchiragvithalani",
    "k": "profile",
    "n": "Anchor"
   }
  ]
 },
 "mandi": {
  "title": "Mandi & Mehendi",
  "icon": "🌿",
  "nav": "Mandi",
  "desc": "Mandi and mehendi setups from your saved reels.",
  "links": [
   {
    "c": "DNDjbzOof5F",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DUFJQg0Ewya",
    "k": "p",
    "n": ""
   },
   {
    "c": "DMzpGqMKRVv",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGvb3umtVNj",
    "k": "p",
    "n": ""
   },
   {
    "c": "DGsLzfgo-1E",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGFkKpyi0Ec",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DFcs-MvNKOq",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DDgtqo-xbJ8",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C5_UdAtIgUX",
    "k": "reel",
    "n": ""
   }
  ]
 },
 "clothes": {
  "title": "Clothes & Couture",
  "icon": "👗",
  "nav": "Clothes",
  "desc": "Outfit inspiration and designers. Cross-reference anything you like against the Attire page, where the actual commissions get tracked.",
  "links": [
   {
    "c": "DRwLHaUD5v9",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DO3stNGE6gW",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DM2fpy3TYns",
    "k": "p",
    "n": ""
   },
   {
    "c": "DJO3kVFSCZz",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DItZvnBS7Hs",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DI2qvoKxQqZ",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGvlI9voSO_",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DIJaUMlBJO-",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DHTPMZKSwRa",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DG3TZB4SLQD",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DGTFHdqKX5b",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DDZetS8T6pP",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DEA480wSzm9",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C6wFwf1Bs1x",
    "k": "p",
    "n": ""
   },
   {
    "c": "C7qgM_wMRKt",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DBnqhuQvH1r",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DBTRoUSJ6-Y",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DBQt6U7gpn0",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C-8BiYryecH",
    "k": "p",
    "n": ""
   },
   {
    "c": "C8_2FK_MclR",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C-QW_cgMHCW",
    "k": "p",
    "n": ""
   },
   {
    "c": "DA0f8HDPzKl",
    "k": "p",
    "n": ""
   },
   {
    "c": "Cxiza06SLdF",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C4dFpzysLKr",
    "k": "p",
    "n": ""
   }
  ]
 },
 "jewellery": {
  "title": "Jewellery",
  "icon": "💍",
  "nav": "Jewellery",
  "desc": "Jewellery saved from your reels, including hair jewellery and neckline pairings.",
  "links": [
   {
    "c": "DUkOZdZDK0w",
    "k": "p",
    "n": ""
   },
   {
    "c": "DTSz5ieDL_R",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DNLv4niTTnK",
    "k": "reel",
    "n": "Hair jewellery"
   },
   {
    "c": "DGSzlViyD-c",
    "k": "reel",
    "n": ""
   },
   {
    "c": "C0_kXTKysZB",
    "k": "p",
    "n": ""
   },
   {
    "c": "C0WYXU9RS9N",
    "k": "p",
    "n": ""
   },
   {
    "c": "DANj0PpP9oM",
    "k": "reel",
    "n": "Neckline & jewellery pairing"
   }
  ]
 },
 "decor": {
  "title": "Decor, Games & Ideas",
  "icon": "🎪",
  "nav": "Decor & Ideas",
  "desc": "The inspiration pile — decor, guest experiences, favours and games. Hand the ones you love to your planner rather than sourcing them yourself.",
  "links": [
   {
    "c": "DVA8Uk9jFbk",
    "k": "p",
    "n": ""
   },
   {
    "c": "DU4-j85CfT2",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DUGXkSgAJbd",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DUNhfqTDiTz",
    "k": "reel",
    "n": "Event name ideas"
   },
   {
    "c": "DQ8m-N0Eo4Q",
    "k": "reel",
    "n": "Gift bags"
   },
   {
    "c": "DP3DAFvjAve",
    "k": "reel",
    "n": "Bartender"
   },
   {
    "c": "DAY5YjuIeyD",
    "k": "reel",
    "n": "Ring for cocktail"
   },
   {
    "c": "DP3rHubCbCd",
    "k": "reel",
    "n": "Bridal consultation"
   },
   {
    "c": "DO6glcEDjmh",
    "k": "reel",
    "n": "Custom guest painting"
   },
   {
    "c": "DOAbopYEyly",
    "k": "reel",
    "n": "Gifting"
   },
   {
    "c": "DNqEiCHJ-Nn",
    "k": "reel",
    "n": "Custom wedding stationery"
   },
   {
    "c": "DNnA9KGMPze",
    "k": "reel",
    "n": "Hydration station / booths"
   },
   {
    "c": "DOuU7iej9p_",
    "k": "reel",
    "n": "Guests signing cameras"
   },
   {
    "c": "DLzJ0N-TeMl",
    "k": "reel",
    "n": "Block printing"
   },
   {
    "c": "DLnC08BSZKb",
    "k": "reel",
    "n": "Phrase rings for guests"
   },
   {
    "c": "DDWk8FESwC2",
    "k": "reel",
    "n": "Phrase rings for guests"
   },
   {
    "c": "DLfZYdKvfoN",
    "k": "reel",
    "n": "Creative drinks for carnival"
   },
   {
    "c": "DKEyxjVJnrB",
    "k": "reel",
    "n": "Mandap decor inspo"
   },
   {
    "c": "DJraZNrx24K",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DIOq-Wzzo39",
    "k": "reel",
    "n": "Varmala"
   },
   {
    "c": "DG3FE_tyAko",
    "k": "reel",
    "n": "Cards"
   },
   {
    "c": "C66lIXNqZSC",
    "k": "reel",
    "n": ""
   },
   {
    "c": "DId7d4iSpvD",
    "k": "reel",
    "n": "DIY sunglasses"
   },
   {
    "c": "DA8ZUcXox9B",
    "k": "p",
    "n": ""
   },
   {
    "c": "C5g9XHgxUBq",
    "k": "reel",
    "n": "Bridesmaids"
   },
   {
    "c": "CjN1Y_MsnDU",
    "k": "reel",
    "n": "Garba dancers"
   }
  ]
 }
};
