# Libra Sans font (self-hosted)

To use **Libra Sans** in the app, add the font files here.

1. **Download** from one of these (OFL-licensed, free):
   - [Local Fonts – Libra Sans](https://localfonts.eu/freefonts/bulgarian-cyrillic/libra-sans/) (Google Drive link on page)
   - [Font Library – Libra Sans](https://fontlibrary.org/en/font/libra-sans) (ZIP download)

2. **Place** these files in this folder (`public/fonts/`):
   - `LibraSans-Regular.woff2` or `LibraSans-Regular.ttf` (normal weight)
   - `LibraSans-Bold.woff2` or `LibraSans-Bold.ttf` (bold weight)

   If the downloaded files use different names (e.g. `Libra Sans Regular.otf`), rename them to the names above, or convert to WOFF2/TTF and name as above.

3. **Restart** the dev server so the app can load the fonts.

The app will use Libra Sans for all admin and user pages when these files are present; otherwise it falls back to system UI fonts.
