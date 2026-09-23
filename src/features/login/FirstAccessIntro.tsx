import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, X } from "lucide-react";
import { introLines } from "../../lib/letterUtils";

type FirstAccessIntroProps = {
  index: number;
  setIndex: (index: number) => void;
  onFinish: () => void;
};

export default function FirstAccessIntro({
  index,
  setIndex,
  onFinish,
}: FirstAccessIntroProps) {
  const current = Math.max(index, 0);
  return (
    <motion.div
      className="intro-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="intro-skip" onClick={onFinish}>
        pular <X size={14} />
      </button>
      <div className="intro-content">
        <div className="intro-flower">✳</div>
        {index === -1 ? (
          <>
            <motion.p
              className="intro-line greeting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              Oi, Bia.
              <br />
              Eu fiz uma coisa pra você.
            </motion.p>
            <button className="intro-next" onClick={() => setIndex(0)}>
              entrar <ChevronRight size={15} />
            </button>
          </>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.p
                key={current}
                className="intro-line"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.7 }}
              >
                {introLines[current]}
              </motion.p>
            </AnimatePresence>
            {current < introLines.length - 1 ? (
              <button
                className="intro-next"
                onClick={() => setIndex(current + 1)}
              >
                continuar <ChevronRight size={15} />
              </button>
            ) : (
              <button className="intro-finish" onClick={onFinish}>
                entrar no nosso cantinho <ArrowUpRight size={16} />
              </button>
            )}
            <div className="intro-progress">
              {introLines.map((_, i) => (
                <i key={i} className={i <= current ? "done" : ""} />
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
