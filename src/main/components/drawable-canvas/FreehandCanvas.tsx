import React, { useEffect, useRef } from 'react';
import * as iink from 'iink-js';

export const FreehandCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorStyle = {
    minWidth: '100px',
    minHeight: '100px',
    width: '100vw',
    height: 'calc(100vh - 190px)',
    touchAction: 'none',
  };

  useEffect(() => {
    let canvas = canvasRef.current;
    canvas = iink.register(canvasRef.current, {
      recognitionParams: {
        type: 'TEXT',
        protocol: 'WEBSOCKET',
        apiVersion: 'V4',
        server: {
          scheme: 'https',
          host: 'webdemoapi.myscript.com',
          applicationKey: '1463c06b-251c-47b8-ad0b-ba05b9a3bd01',
          hmacKey: '60ca101a-5e6d-4159-abc5-2efcbecce059',
        },
      },
    });
  }, []);

  return (
    <div className="App">
      <div style={editorStyle} ref={canvasRef} touch-action="none" />
    </div>
  );
};
