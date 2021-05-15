import React from 'react';
import { ICommunicationLinkMessage } from './uml-communiction-link-message';
import { Text } from '../../../components/controls/text/text';

type Props = {
  x: number;
  y: number;
  messages: ICommunicationLinkMessage[];
  fill?: string;
  directionIcon: string;
  textCentered?: boolean;
};

export const UmlCommunicationLinkTextComponent: React.FC<Props> = ({
  x,
  y,
  fill,
  textCentered = false,
  messages,
  directionIcon,
}) => {
  const tspanProps = textCentered ? { textAnchor: 'middle' } : {};
  return (
    <Text x={x} y={y} fontSize="85%" textAnchor="start" dominantBaseline="auto" fontWeight="normal" fill={fill}>
      <tspan fontWeight="bold" fontSize="120%" {...tspanProps}>
        {messages.length ? directionIcon : ''}
      </tspan>
      {messages.map((message, i) => (
        <tspan key={i} x={message.bounds.x} y={message.bounds.y}>
          {message.name}
        </tspan>
      ))}
    </Text>
  );
};
