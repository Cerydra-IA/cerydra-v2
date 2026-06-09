# Sound Effects

Place the following 3 audio files in this directory (`video/public/sounds/`) before rendering:

## Required Files

### `bg-music.mp3`
Background music that plays throughout the entire video (volume: 0.15 — subtle).

Suggested sources:
- https://freemusicarchive.org — search "ambient" or "corporate" in the Creative Commons section
- https://pixabay.com/music/ — search "background" or "corporate ambient"
- https://www.bensound.com — "corporate" section (free with attribution)

Recommended: something calm, modern, minimal — around 80–120 BPM. Duration should be at least 80 seconds.

### `email-ding.mp3`
A short notification sound played at the start of the Email Confirmation scene (frame 900).

Suggested sources:
- https://pixabay.com/sound-effects/ — search "email notification" or "ding"
- https://freesound.org — search "notification ding"

Duration: ~0.5–1 second. Should be clean and pleasant (not harsh).

### `reminder-ding.mp3`
A soft ding sound played at the start of the Rappel 24h scene (frame 1200).

Same sources as above. Can be the same file as `email-ding.mp3` or a slightly different tone.

Duration: ~0.5–1 second.

## Notes

- All files must be in MP3 format.
- If these files are missing, Remotion will either error or play silence — the video will still render but without sound.
- You can use `null` audio src workarounds if needed for testing: comment out the `<Audio>` elements in `CerydraVideo.tsx`.
