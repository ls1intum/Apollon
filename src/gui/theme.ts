type CSSWideKeyword = "initial" | "inherit" | "unset";

type FontWeight =
    | CSSWideKeyword
    | "normal"
    | "bold"
    | "bolder"
    | "lighter"
    | 100
    | 200
    | 300
    | 400
    | 500
    | 600
    | 700
    | 800
    | 900;

export interface Theme {
    primaryColor: string;
    borderColor: string;
    highlightColor: string;
    highlightColorDarker: string;
    highlightBorderColor: string;
    interactiveAreaColor: string;
    interactiveAreaHoverColor: string;
    fontFamily: string;
    headingFontFamily: string;
    headingFontWeight: FontWeight;
}

const defaultTheme: Theme = {
    primaryColor: "#2A8FBD",
    borderColor: "#AAAAAA",
    highlightColor: "rgba(0, 100, 255, 0.21)",
    highlightColorDarker: "rgba(0, 100, 255, 0.6)",
    highlightBorderColor: "rgba(0, 100, 255, 0.6)",
    interactiveAreaColor: "rgba(0, 220, 0, 0.3)",
    interactiveAreaHoverColor: "rgba(0, 220, 0, 0.15)",
    fontFamily: "HelveticaNeue, Helvetica, Arial, Verdana, sans-serif",
    headingFontFamily: "HelveticaNeue-Light, Helvetica, Arial, Verdana, sans-serif",
    headingFontWeight: 300
};

export function createTheme(userTheme: Partial<Theme>): Theme {
    return {
        ...defaultTheme,
        ...userTheme
    };
}
