import { motion } from "framer-motion";
import './VoidTxLanding.css';

export default function VoidTxLanding({ onGetStarted }) {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="landing-navbar"
      >
        <h1 className="landing-logo">
          ⚡ VoidTx
        </h1>
        <div className="landing-nav-links">
          <a className="landing-nav-link" href="#features">Features</a>
          <a className="landing-nav-link" href="#security">Security</a>
          <a className="landing-nav-link" href="#contact">Contact</a>
        </div>
        <button onClick={onGetStarted} className="landing-cta-button">
          Launch App
        </button>
      </motion.nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="landing-hero-title"
        >
          The Fastest Way<br /> to Move Money.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="landing-hero-subtitle"
        >
          VoidTx lets you send batch payments instantly with blockchain
          security and a beautiful, intuitive experience. Pay multiple recipients
          in a single transaction.
        </motion.p>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <button onClick={onGetStarted} className="landing-hero-button">
            Start Sending Payments
          </button>
        </motion.div>

        {/* Floating Glow Animation */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 6 }}
          className="landing-glow"
        />
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <h3 className="landing-section-title">Why VoidTx?</h3>

        <div className="landing-features-grid">
          {[
            {
              icon: "⚡",
              title: "Instant Batch Payments",
              desc: "Send payments to multiple recipients in a single transaction. Save time.",
            },
            {
              icon: "🔒",
              title: "Blockchain Security",
              desc: "Built on Ethereum with smart contract security. Your transactions are transparent and immutable.",
            },
// Gas optimization feature removed as per user request
            {
              icon: "✨",
              title: "Simple Templates",
              desc: "Split equally or send fixed amounts. Easy-to-use templates for common payment scenarios.",
            },
            {
              icon: "📊",
              title: "CSV Import",
              desc: "Upload recipient lists from CSV files. Perfect for payroll, airdrops, and bulk distributions.",
            },
            {
              icon: "🧾",
              title: "On-Chain Receipts",
              desc: "Every payment generates a permanent blockchain receipt. Share and verify transactions easily.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="landing-feature-card"
            >
              <div className="landing-feature-icon">{item.icon}</div>
              <h4 className="landing-feature-title">{item.title}</h4>
              <p className="landing-feature-desc">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <h3 className="landing-section-title">How It Works</h3>
        
        <div className="landing-steps">
          {[
            {
              step: "1",
              title: "Connect Wallet",
              desc: "Connect your Ethereum wallet using MetaMask or WalletConnect"
            },
            {
              step: "2",
              title: "Add Recipients",
              desc: "Enter recipient addresses manually, use templates, or import from CSV"
            },
            {
              step: "3",
              title: "Review & Send",
              desc: "Preview gas costs and confirm your batch payment in one click"
            },
            {
              step: "4",
              title: "Get Receipt",
              desc: "Receive an on-chain receipt with transaction details you can share"
            }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="landing-step"
            >
              <div className="landing-step-number">{item.step}</div>
              <div className="landing-step-content">
                <h4 className="landing-step-title">{item.title}</h4>
                <p className="landing-step-desc">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="landing-security">
        <h3 className="landing-section-title">Enterprise‑Grade Security</h3>

        <div className="landing-security-content">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="landing-security-text"
          >
            <h4 className="landing-security-heading">🛡️ Built on Ethereum</h4>
            <p>
              VoidTx smart contracts are deployed on Ethereum, ensuring your
              payments are secured by the world's most trusted blockchain network.
              Every transaction is transparent and verifiable on-chain.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="landing-security-text"
          >
            <h4 className="landing-security-heading">⚙️ Smart Contract Safety</h4>
            <p>
              Our smart contracts include built-in validations, duplicate detection,
              and amount verification. Real-time validation prevents errors before
              you send, protecting both you and your recipients.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta-section">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="landing-cta-box"
        >
          <h3 className="landing-cta-title">Ready to send your first batch payment?</h3>
          <p className="landing-cta-text">
            Join thousands of users who trust VoidTx for their bulk payment needs
          </p>
          <button onClick={onGetStarted} className="landing-cta-main-button">
            Launch VoidTx App
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <h4 className="landing-footer-logo">⚡ VoidTx</h4>
            <p className="landing-footer-tagline">Batch payments made simple</p>
          </div>
          <div className="landing-footer-links">
            <a href="#features" className="landing-footer-link">Features</a>
            <a href="#security" className="landing-footer-link">Security</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="landing-footer-link">GitHub</a>
            <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="landing-footer-link">Etherscan</a>
          </div>
        </div>
        <div className="landing-footer-copyright">
          VoidTx © {new Date().getFullYear()} • Built with ❤️ on Ethereum
        </div>
      </footer>
    </div>
  );
}
