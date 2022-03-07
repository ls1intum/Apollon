import { styled } from './styles';
import { SVGProps } from 'react';

export const ThemedPolyline = styled.polyline.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
  }))`
    fill: ${(props) => props.fillColor || props.theme.color.background};
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast};
`;

export const ThemedPath = styled.path.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
}))`
    fill: ${(props) => props.fillColor || props.theme.color.background };
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast };
`;

export const ThemedPathContrast = styled.path.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
}))`
    fill: ${(props) => props.fillColor || props.theme.color.primaryContrast };
    stroke: ${(props) => props.strokeColor || props.theme.color.background };
`;

export const ThemedRect = styled.rect.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
}))`
    fill: ${(props) => props.fillColor || props.theme.color.background };
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast };
`;

export const ThemedRectContrast = styled.rect.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
}))`
    fill: ${(props) => props.fillColor || props.theme.color.primaryContrast };
    stroke: ${(props) => props.strokeColor || props.theme.color.background };
`;

export const ThemedCircle = styled.circle.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
  }))`
    fill: ${(props) => props.fillColor || props.theme.color.background};
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast}
`;

export const ThemedCircleContrast = styled.circle.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
  }))`
    fill: ${(props) => props.fillColor || props.theme.color.primaryContrast};
    stroke: ${(props) => props.strokeColor || props.theme.color.background}
`;

export const ThemedEllipse = styled.ellipse.attrs((props: { fillColor: string | undefined; strokeColor: string | undefined }) => ({
    fillColor: props.fillColor,
    strokeColor: props.strokeColor,
  }))`
    fill: ${(props) => props.fillColor || props.theme.color.background};
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast}
`;

export const ThemedLine = styled.line.attrs((props: { strokeColor: string | undefined }) => ({
    strokeColor: props.strokeColor,
  }))`
    stroke: ${(props) => props.strokeColor || props.theme.color.primaryContrast}
`;
