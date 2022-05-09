import { CheckIcon } from '../../controls/icon/check';
import { ExclamationIcon } from '../../controls/icon/exclamation';
import { TimesIcon } from '../../controls/icon/times';
import { styled } from '../../theme/styles';

export const ICON_SIZE = 24;

export const Container = styled.circle.attrs((props) => ({
  r: ICON_SIZE / 2 + 4,
  fillOpacity: 0.8,
  fill: props.theme.color.gray,
}))``;

export const Triangle = styled.polygon.attrs((props) => ({
  points: '-10,8 0,-10 10,8',
  fill: props.theme.color.warningYellow,
}))``;

const icon = {
  x: -ICON_SIZE / 2,
  y: -ICON_SIZE / 2,
  width: ICON_SIZE,
  height: ICON_SIZE,
};

const smallIcon = {
  x: -ICON_SIZE / 4,
  y: -ICON_SIZE / 4 + 1,
  width: ICON_SIZE / 2,
  height: ICON_SIZE / 2,
};

export const CorrectIcon = styled(CheckIcon).attrs(icon)`
  fill: green;
`;

export const WrongIcon = styled(TimesIcon).attrs(icon)`
  fill: red;
`;

export const FeedbackIcon = styled(ExclamationIcon).attrs(icon)`
  fill: blue;
`;

export const WarningIcon = styled(ExclamationIcon).attrs(smallIcon)`
  fill: black;
`;
