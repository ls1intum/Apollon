import { styled } from '../../theme/styles';

export const DropdownMenu = styled.div`
  background-clip: padding-box;
  background-color: ${(props) => props.theme.color.background};
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.25em;
  list-style: none;
  margin: 0.125em 0 0;
  padding: 0.5em 0;
  position: absolute;
  text-align: left;
  z-index: 1000;
`;
