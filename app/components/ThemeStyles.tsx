export type Theme = "light" | "dark" | "system";

const lightTheme = `
  --bg: #fff;
  --accent-bg: #f5f7ff;
  --text: #212121;
  --text-light: #585858;
  --border: #898EA4;
  --accent: color(display-p3 0.05 0.28 0.63);
  --code: color(display-p3 0.84 0.1 0.37);
  --preformatted: #444;
  --marked: #ffdd33;
  --disabled: #efefef;
`;

const darkTheme = `
  --bg: #212121;
  --accent-bg: #2b2b2b;
  --text: #dcdcdc;
  --text-light: #ababab;
  --accent: color(display-p3 1 0.7 0);
  --code: color(display-p3 0.94 0.38 0.57);
  --preformatted: #ccc;
  --disabled: #111;
`;

const lightThemeImg = `img, video { opacity: 0.8; }`;
const darkThemeImg = `img, video { opacity: 0.8; }`;

export default function ThemeStyles({ theme }: { theme: Theme }) {
  return (
    <>
      <meta
        name="color-scheme"
        content={theme === "system" ? "light dark" : theme}
      />

      {["system", "dark"].includes(theme) ? (
        <meta
          name="theme-color"
          content="#2b2b2b"
          media={
            theme === "system" ? "(prefers-color-scheme: dark)" : undefined
          }
        />
      ) : null}

      {["system", "light"].includes(theme) ? (
        <meta
          name="theme-color"
          content="#f5f7ff"
          media={
            theme === "system" ? "(prefers-color-scheme: light)" : undefined
          }
        />
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root, ::backdrop {
              ${theme === 'dark' ? darkTheme : lightTheme}
            }
            @media (prefers-color-scheme: dark) {
              :root,
              ::backdrop {
                color-scheme: dark;
                ${theme === 'light' ? lightTheme : darkTheme}
              }
              ${
                theme === 'light'
                  ? lightThemeImg
                  : darkThemeImg
              }
            }`.replace(/\s+/g, " "),
        }}
      ></style>
    </>
  );
}
