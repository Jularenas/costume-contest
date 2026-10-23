// Site settings. Edit and push; GitHub Pages redeploys automatically.
window.CONTEST_CONFIG = {
  title: 'Concurso de Disfraces',

  // Shared storage for the live site (see README → "Go live").
  // Leave blank and the site runs in device-only demo mode.
  supabaseUrl: 'https://dlxdjgdvefamcughvibw.supabase.co',
  supabaseAnonKey: 'sb_publishable_AUTZIZCJOj8OTW1jxj2yeQ_Q8z6eXze',

  // Open the site with ?admin=<this> to get Remove / Reset buttons.
  adminKey: 'pumpkin',

  // Countdown in the header, fixed to Bogotá time (UTC-5) so every phone shows the same moment.
  // Remove this block to hide it.
  countdown: {
    to: '2026-10-24T01:00:00-05:00',
    label: 'Faltan',
    done: '¡Llegó la hora! 🎃',
  },

  // Background characters, files in img/characters/. Add a line to add one.
  // edge: 'side' (default) spreads them down the left/right edges;
  // 'bottom-left' / 'bottom-right' sit cut-off pictures on the bottom corners
  // (first listed goes closest to the corner).
  decorations: [
    { src: 'vampiro.webp' },
    { src: 'cafe.webp' },
    { src: 'presidente.webp' },
    { src: 'karol-feid.webp' },
    { src: 'super-mama.webp' },
    { src: 'super-papa.webp' },
    { src: 'gansito.webp' },
    { src: 'vaca.webp' },
    { src: 'muy-buenos-dias.webp', edge: 'bottom-left' },
    { src: 'zorro-rojo.webp', edge: 'bottom-left' },
    { src: 'bigote.webp', edge: 'bottom-left' },
    { src: 'aurelio.webp', edge: 'bottom-left' },
    { src: 'minnie-mickey.webp', edge: 'bottom-right' },
    { src: 'tigre.webp', edge: 'bottom-right' },
    { src: 'calcetin.webp', edge: 'bottom-right' },
  ],
};
