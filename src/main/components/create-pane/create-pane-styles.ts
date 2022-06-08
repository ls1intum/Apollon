import { styled } from '../theme/styles';

export const Separator = styled.div`
  width: 100%;
  text-align: center;
  margin: 1rem 0;
  height: 2px;
  background-color: ${(props) => props.theme.color.primaryContrast};
`;
