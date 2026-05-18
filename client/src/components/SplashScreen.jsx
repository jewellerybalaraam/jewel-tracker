import {
  motion,
  AnimatePresence,
} from "framer-motion";

function SplashScreen({ show }) {

  return (

    <AnimatePresence>

      {show && (

        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
        >

          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-40 h-40 rounded-full border-4 border-pink-500 border-t-purple-500"
          />

        </motion.div>

      )}

    </AnimatePresence>
  );
}

export default SplashScreen;