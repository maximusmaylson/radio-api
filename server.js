const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { Parser } = require("icecast-parser");

const app = express();
app.use(cors());

const stations = [
  { id: "top40", name: "1.FM Top 40", desc: "Hits Internacionais", url: "http://strm112.1.fm/top40_mobile_mp3", icon: "fas fa-fire" },
  { id: "dance", name: "1.FM Dance", desc: "Eletrônica & Dance", url: "http://strm112.1.fm/dance_mobile_mp3", icon: "fas fa-compact-disc" },
  { id: "country", name: "1.FM Country", desc: "Classic Country", url: "http://strm112.1.fm/acountry_mobile_mp3", icon: "fas fa-guitar" },
  { id: "reggae", name: "1.FM Reggae", desc: "Reggae Trade", url: "http://strm112.1.fm/reggae_mobile_mp3", icon: "fas fa-leaf" }
];

const stationData = {};

async function getCover(artist, title) {
  try {
    const term = encodeURIComponent(`${artist} ${title}`);
    const res = await axios.get(`https://itunes.apple.com/search?term=${term}&limit=1&entity=song`);
    if (res.data.results && res.data.results.length > 0) {
      return res.data.results[0].artworkUrl100.replace("100x100bb", "512x512bb");
    }
  } catch (e) {}
  return "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400";
}

stations.forEach(station => {
  stationData[station.id] = { current: {}, history: [] };
  const radio = new Parser({ url: station.url, autoUpdate: true });
  
  radio.on("metadata", async (metadata) => {
    const streamTitle = metadata.StreamTitle || "";
    if (!streamTitle) return;

    let artist = "Artista Desconhecido", title = streamTitle;
    if (streamTitle.includes(" - ")) {
      const parts = streamTitle.split(" - ");
      artist = parts[0].trim();
      title = parts.slice(1).join(" - ").trim();
    }

    if (stationData[station.id].current.title === title) return;

    const cover = await getCover(artist, title);
    const newTrack = { artist, title, cover };

    if (stationData[station.id].current.title) {
      stationData[station.id].history.unshift(stationData[station.id].current);
      if (stationData[station.id].history.length > 3) stationData[station.id].history.pop();
    }
    stationData[station.id].current = newTrack;
  });
  radio.on("error", () => {});
});

app.get("/api/stations", (req, res) => res.json({ brandImage: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400", stations }));
app.get("/api/nowplaying/:id", (req, res) => {
  const data = stationData[req.params.id];
  if (!data || !data.current.title) return res.json({ hasTrack: false });
  res.json({ hasTrack: true, title: data.current.title, artist: data.current.artist, cover: data.current.cover, color: "#FFEC00" });
});
app.get("/api/history/:id", (req, res) => res.json({ history: stationData[req.params.id] ? stationData[req.params.id].history : [] }));

app.listen(process.env.PORT || 3000, () => console.log("Servidor rodando!"));
