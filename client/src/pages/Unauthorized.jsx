import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import Meteors from '../components/effects/Meteors';
import Button from '../components/ui/Button';

export default function Unauthorized() {
  return (
    <div className="dark-gradient min-h-screen relative overflow-hidden flex items-center justify-center p-6">
      <Meteors number={15} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-10 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-red-400/10 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">需要管理授权</h1>
        <p className="text-white/50 mb-8 leading-relaxed">
          请通过带有 <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 text-xs">?token=</code> 参数的链接访问管理后台，或确认 Token 未过期。
        </p>
        <Link to="/admin">
          <Button variant="primary" size="lg" className="w-full">
            返回首页
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
