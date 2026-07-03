import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts, fontStyle } from "../utils/fonts";
import { Avatar, CallingScreen, Fade, IOSNotification, PhoneFrame, Punch, Sub } from "./ui";

const S = (p: string) => staticFile(`screenshots/${p}`);

export const GlobalStyle: React.FC = () => <style>{fontStyle}</style>;

// ═══ S1 — L'appel manqué (split-screen) ═════════════════════════════
export const S1Appel: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const shake = Math.sin(frame / 1.6) * interpolate(frame, [20, 30, 150, 160], [0, 5, 5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fade duration={duration}>
      <AbsoluteFill style={{ flexDirection: vertical ? "column" : "row" }}>
        {/* Côté Sophie */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(160deg,#151528 0%,#0d0d1a 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: vertical ? 28 : 48, left: 48 }}>
            <Avatar name="Sophie" hue="#7c5cff" size={vertical ? 52 : 64} />
          </div>
          <PhoneFrame width={vertical ? 260 : 300}>
            <CallingScreen />
          </PhoneFrame>
        </div>
        {/* Côté Marc */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(160deg,#241410 0%,#140b08 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: vertical ? 28 : 48, right: 48 }}>
            <Avatar name="Marc" hue="#e8743b" size={vertical ? 52 : 64} />
          </div>
          <div style={{ fontSize: vertical ? 110 : 150, transform: `rotate(${shake}deg)` }}>🍳</div>
          <div
            style={{
              position: "absolute",
              bottom: vertical ? "48%" : "26%",
              right: "16%",
              fontSize: vertical ? 64 : 84,
              transform: `rotate(${-shake * 2}deg)`,
              filter: "grayscale(.2)",
            }}
          >
            📳
          </div>
          <Sub
            text="Vendredi, 19h42. En plein coup de feu."
            appear={20}
            size={vertical ? 24 : 28}
            style={{ position: "absolute", bottom: vertical ? 60 : 120 }}
          />
        </div>
      </AbsoluteFill>
      {/* Punchline bas */}
      <div
        style={{
          position: "absolute",
          bottom: vertical ? 170 : 60,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Punch
          text="Un appel manqué, c'est une table vide."
          appear={55}
          size={vertical ? 52 : 60}
        />
      </div>
    </Fade>
  );
};

// ═══ S2 — Sophie trouve le site ═════════════════════════════════════
export const S2Site: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, duration], [1, 1.08]);
  return (
    <Fade duration={duration}>
      <AbsoluteFill style={{ background: "#0a0805", justifyContent: "center", alignItems: "center" }}>
        <Img
          src={S(vertical ? "comptoir_mobile_hero.png" : "comptoir_desktop_hero.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg,transparent 40%,rgba(5,4,2,.88) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: vertical ? 200 : 90,
            width: "100%",
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          <Punch text="Mais sur le site du restaurant…" appear={8} size={vertical ? 48 : 58} />
          <Sub
            text="le widget CERYDRA est là. Réservation en ligne, 24h/24."
            appear={30}
            size={vertical ? 26 : 32}
            style={{ marginTop: 16 }}
          />
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S3 — Le parcours widget (vraie vidéo) ══════════════════════════
export const S3Widget: React.FC<{
  duration: number;
  vertical?: boolean;
  playbackRate?: number;
}> = ({ duration, vertical, playbackRate = 2.6 }) => {
  const frame = useCurrentFrame();
  // la modal s'ouvre ~4,5s dans la vidéo brute → masque la zone grise ensuite
  const maskAt = Math.round((4.5 * 30) / playbackRate);
  const maskOpacity = interpolate(frame, [maskAt, maskAt + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fade duration={duration}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 30%, #1b2a5e 0%, ${colors.navy} 65%)`,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 30 : 110,
        }}
      >
        <PhoneFrame width={vertical ? 420 : 400}>
          <OffthreadVideo
            src={S("widget-flow.webm")}
            playbackRate={playbackRate}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* masque la zone grise sous la modal du widget */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "23%",
              background: "#f9fafb",
              opacity: maskOpacity,
            }}
          />
        </PhoneFrame>
        <div style={{ maxWidth: vertical ? "86%" : 560, textAlign: vertical ? "center" : "left" }}>
          <Punch text="Sophie réserve en 30 secondes." size={vertical ? 46 : 62} appear={12} />
          <Sub
            text="Nom, date, heure — c'est tout. Aucune application à installer."
            appear={40}
            size={vertical ? 26 : 32}
            style={{ marginTop: 20 }}
          />
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S4 — Email de confirmation ═════════════════════════════════════
export const S4Email: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, config: { damping: 18 }, from: 120, to: 0 });
  return (
    <Fade duration={duration}>
      <AbsoluteFill
        style={{
          background: "#eef1f7",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <Punch
          text="Confirmation immédiate. ✉️"
          size={vertical ? 48 : 58}
          color={colors.navy}
          appear={4}
        />
        <div
          style={{
            transform: `translateY(${slide}px)`,
            boxShadow: "0 40px 90px rgba(15,30,69,.22)",
            borderRadius: 18,
            overflow: "hidden",
            maxWidth: vertical ? "88%" : 1020,
            maxHeight: "62%",
          }}
        >
          <Img src={S("email-confirmation.png")} style={{ width: "100%", display: "block" }} />
        </div>
        <Sub
          text="Envoyé automatiquement, aux couleurs du restaurant."
          appear={26}
          size={vertical ? 24 : 30}
          style={{ color: "#59627a" }}
        />
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S5 — Côté Marc : notification + dashboard ══════════════════════
export const S5Notif: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const half = Math.round(duration * 0.5);
  const showPlan = frame >= half;
  const planFade = interpolate(frame, [half - 8, half + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Fade duration={duration}>
      <AbsoluteFill style={{ background: colors.navy, justifyContent: "center", alignItems: "center" }}>
        {/* Dashboard réservations */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: 1 - planFade,
          }}
        >
          <Img
            src={S("dashboard-reservations.png")}
            style={{
              width: vertical ? "160%" : "78%",
              borderRadius: 16,
              boxShadow: "0 40px 100px rgba(0,0,0,.5)",
            }}
          />
        </div>
        {/* Plan de salle */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: planFade,
          }}
        >
          <Img
            src={S("plan-de-salle.png")}
            style={{
              width: vertical ? "160%" : "78%",
              borderRadius: 16,
              boxShadow: "0 40px 100px rgba(0,0,0,.5)",
            }}
          />
        </div>
        {/* Notification qui slide */}
        <div style={{ position: "absolute", top: vertical ? 120 : 60, width: "100%", display: "flex", justifyContent: "center" }}>
          <IOSNotification appear={8} width={vertical ? 700 : 680} />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: vertical ? 180 : 54,
            width: "100%",
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          <Punch
            text={showPlan ? "…et sur son plan de salle." : "Marc n'a rien touché. La résa est là."}
            size={vertical ? 44 : 54}
            appear={showPlan ? half + 4 : 20}
          />
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S6 — Rappel la veille ══════════════════════════════════════════
export const S6Rappel: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, config: { damping: 18 }, from: 120, to: 0 });
  return (
    <Fade duration={duration}>
      <AbsoluteFill
        style={{
          background: "#eef1f7",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <Punch text="La veille : rappel automatique. ⏰" size={vertical ? 46 : 56} color={colors.navy} appear={4} />
        <Sub
          text="Moins de no-shows, sans lever le petit doigt."
          appear={22}
          size={vertical ? 25 : 30}
          style={{ color: "#59627a" }}
        />
        <div
          style={{
            transform: `translateY(${slide}px)`,
            boxShadow: "0 40px 90px rgba(15,30,69,.22)",
            borderRadius: 18,
            overflow: "hidden",
            maxWidth: vertical ? "88%" : 1060,
            maxHeight: "58%",
          }}
        >
          <Img src={S("email-rappel.png")} style={{ width: "100%", display: "block" }} />
        </div>
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S7 — Avis Google ═══════════════════════════════════════════════
export const S7Avis: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Fade duration={duration}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 20%, #1b2a5e 0%, ${colors.navy} 70%)`,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 34,
        }}
      >
        <Punch text="Le lendemain, Sophie laisse un avis." size={vertical ? 42 : 56} appear={4} />
        {/* 5 étoiles animées */}
        <div style={{ display: "flex", gap: 18 }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const f = Math.max(0, frame - 28 - i * 9);
            const sc = spring({ frame: f, fps, config: { damping: 11, stiffness: 190 }, from: 0, to: 1 });
            return (
              <div key={i} style={{ fontSize: vertical ? 74 : 92, transform: `scale(${sc})` }}>
                ⭐
              </div>
            );
          })}
        </div>
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 40px 90px rgba(0,0,0,.4)",
            maxWidth: vertical ? "86%" : 1150,
            maxHeight: "46%",
          }}
        >
          <Img src={S("email-avis.png")} style={{ width: "100%", display: "block" }} />
        </div>
        <Sub text="Invitation envoyée automatiquement. Plus d'avis = plus de clients." appear={60} size={vertical ? 24 : 30} />
      </AbsoluteFill>
    </Fade>
  );
};

// ═══ S8 — CTA final ═════════════════════════════════════════════════
export const S8CTA: React.FC<{ duration: number; vertical?: boolean }> = ({
  duration,
  vertical,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 12, stiffness: 150 }, from: 0, to: 1 });
  const pulse = 1 + 0.02 * Math.sin(frame / 6);
  return (
    <Fade duration={duration} fadeOut={20}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 35%, #16265c 0%, ${colors.navy} 70%)`,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 30,
        }}
      >
        <div
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: vertical ? 92 : 110,
            color: "#fff",
            letterSpacing: "0.04em",
          }}
        >
          CERYDRA
        </div>
        <Sub
          text="Vos réservations en pilote automatique."
          appear={12}
          size={vertical ? 30 : 36}
        />
        <div
          style={{
            transform: `scale(${badge * pulse})`,
            background: "#fff",
            color: colors.navy,
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: vertical ? 40 : 46,
            padding: "22px 54px",
            borderRadius: 999,
            marginTop: 18,
            boxShadow: "0 24px 70px rgba(0,0,0,.4)",
          }}
        >
          1ᵉʳ mois GRATUIT
        </div>
        <Sub text="Sans engagement · Installation en 24h" appear={44} size={vertical ? 24 : 28} />
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: vertical ? 34 : 40,
            color: "#9db4ff",
            marginTop: 12,
            opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          cerydra.fr
        </div>
      </AbsoluteFill>
    </Fade>
  );
};
