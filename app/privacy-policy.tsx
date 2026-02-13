import LegalDocumentViewer from "@/components/legal-document-viewer";
import { getPrivacyPolicy } from "@/services/api-service";
import React, { memo } from "react";

function PrivacyPolicyScreen() {
  return (
    <LegalDocumentViewer
      fetchDocument={getPrivacyPolicy}
      fallbackTitle="Privacy Policy"
    />
  );
}

export default memo(PrivacyPolicyScreen);
