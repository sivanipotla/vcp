import { useEffect, useRef } from 'react';
import { colors } from '../styles';

// Styled like a framed photo resting on a shelf, not a flat tech panel:
// a walnut border, a brass hairline just inside it, and a soft inset shadow.
export default function VideoTile({ stream, label, muted, videoOff, small }) {
  const videoRef = useRef(null);

  // Re-attach srcObject whenever the stream changes, and also when videoOff flips back
  // to false, as a safety net. The <video> element itself stays mounted at all times
  // (see render below) — it's never swapped for a placeholder div — because unmounting
  // it loses the srcObject binding and doesn't reliably come back on remount.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream, videoOff]);

  return (
    <div
      style={{
        position: 'relative',
        background: colors.panel,
        borderRadius: 14,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`,
        boxShadow: 'inset 0 0 0 3px rgba(217, 164, 65, 0.12), 0 6px 16px rgba(0,0,0,0.25)',
        aspectRatio: '16 / 9',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: '#140f0c',
          display: videoOff ? 'none' : 'block',
        }}
      />
      {videoOff && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.muted,
            fontSize: small ? 12 : 14,
          }}
        >
          Camera off
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          background: 'rgba(20, 15, 12, 0.65)',
          color: colors.text,
          padding: '3px 9px',
          borderRadius: 8,
          fontSize: small ? 11 : 12,
        }}
      >
        {label}
      </div>
    </div>
  );
}
