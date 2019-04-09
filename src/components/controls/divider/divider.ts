import { styled } from '../../theme/styles';

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${props => props.theme.color.black};
  box-sizing: content-box;
  height: 0;
  margin-top: 1rem;
  margin-bottom: 1rem;
  overflow: visible;
`;
