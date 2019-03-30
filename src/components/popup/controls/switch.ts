import styled from 'styled-components';

export const SwitchItem = styled.button<{ active: boolean }>`
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;

  width: 100%;
  background: none;
  border: 1px solid #2a8fbd;
  border-left: none;
  outline: none !important;

  &:first-child {
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    border-left: 1px solid #2a8fbd;
  }

  &:last-child {
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
  }

  &:hover {
    background: #2a8fbd80;
  }

  ${({ active }) =>
    active &&
    `
      color: white;
      background: #2a8fbd;
    `}
`;

export const Switch = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
`;
