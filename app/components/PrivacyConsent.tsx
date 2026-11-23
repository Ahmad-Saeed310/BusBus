"use client";

import { useEffect, useState } from "react";

const CONSENT_KEY = "electro-privacy-accepted";

const sections = [
 ["1. Independent Application Use", "The Application is provided as a technological platform for its intended functionality. Users access and use the Application voluntarily and are responsible for their own decisions, actions, conduct, and interactions while using the platform. The developer, creator, owner, and operator of the Application do not assume responsibility for independent actions, decisions, statements, or conduct of individual users."],
 ["2. No Responsibility for User Conduct", "The developer shall not be responsible for unlawful, inappropriate, harmful, misleading, unauthorized, or otherwise improper activities independently carried out by users through or in connection with the Application, to the maximum extent permitted by applicable law. Each user is responsible for ensuring that their use of the Application complies with applicable laws and respects the rights, privacy, and safety of other individuals."],
 ["3. Location Information Disclaimer", "The Application may use device location permissions and geographical information to provide location-based functionality. The developer does not guarantee the accuracy, completeness, availability, or reliability of geographical information displayed through the Application. Users are responsible for how they interpret, use, and rely upon geographical information. The developer shall not be responsible, to the maximum extent permitted by applicable law, for consequences arising from users' independent decisions or unauthorized use of geographical information."],
 ["4. No Guarantee of Service", 'The Application is provided on an "AS IS" and "AS AVAILABLE" basis. The developer does not guarantee uninterrupted operation, error-free functionality, continuous availability, or compatibility with every device, browser, operating system, or third-party service. Temporary interruptions, technical failures, maintenance, network problems, and external service disruptions may occur.'],
 ["5. Third-Party Services", "The Application may depend on external technologies, libraries, infrastructure providers, mapping services, and other third-party services. The developer does not control the independent operations, policies, security practices, or availability of those third-party providers. The developer is not responsible for independent acts or omissions of third-party providers, except where responsibility cannot legally be excluded."],
 ["6. Limitation of Liability", "To the maximum extent permitted by applicable law, the developer shall not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of data, loss of profits, service interruptions, or damages arising from users' misuse of the Application. Nothing in this Privacy Policy or any related disclaimer excludes or limits liability for matters that cannot legally be excluded or limited."],
 ["7. No Personal or Professional Advice", "Information and functionality provided through the Application are for their intended informational and technological purposes only. Unless explicitly stated otherwise, the Application does not provide professional, legal, medical, financial, emergency, or personal security advice. Users should independently assess information before relying on it for important decisions."],
 ["8. User Indemnification", "To the extent permitted by applicable law, users may be responsible for claims, losses, damages, or expenses arising from their unlawful use of the Application, violation of these terms, infringement of third-party rights, or misuse of the platform."],
 ["9. No Waiver of Mandatory Legal Rights", "Nothing in this policy is intended to exclude, restrict, or waive any rights, remedies, or responsibilities that cannot legally be excluded, restricted, or waived under applicable law."],
 ["10. Acknowledgment", "By using the Application, users acknowledge that they are responsible for their own activities and decisions and understand the limitations described in this policy. The developer's role is limited to providing the Application and its intended technological functionality, subject to applicable legal obligations."],
];

export default function PrivacyConsent() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY) === "accepted";
    setAccepted(stored);

    const syncOpen = () => {
      const hasAccepted = window.localStorage.getItem(CONSENT_KEY) === "accepted";
      setAccepted(hasAccepted);
      setOpen(!hasAccepted || window.location.hash === "#privacy");
    };
    syncOpen();
    window.addEventListener("hashchange", syncOpen);
    return () => window.removeEventListener("hashchange", syncOpen);
  }, []);

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    setAccepted(true);
    setOpen(false);
    if (window.location.hash === "#privacy") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  if (!open) return null;

  return (
    <div className="privacy-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="privacy-modal">
        <div className="privacy-header">
          <div>
            <p>Electro</p>
            <h2 id="privacy-title">Developer Disclaimer and Limitation of Responsibility</h2>
          </div>
          {accepted && <button className="privacy-close" onClick={() => setOpen(false)} aria-label="Close privacy policy">×</button>}
        </div>
        <div className="privacy-content">
          {sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
        {!accepted ? (
          <div className="privacy-actions">
            <button className="privacy-accept" onClick={accept}>Yes, I agree</button>
          </div>
        ) : (
          <div className="privacy-actions"><button className="privacy-accept" onClick={() => setOpen(false)}>Close policy</button></div>
        )}
      </div>
    </div>
  );
}
