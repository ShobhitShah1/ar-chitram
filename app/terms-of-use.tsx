import LegalDocumentViewer from "@/components/legal-document-viewer";
import { getTermsOfUse } from "@/services/api-service";
import React, { memo } from "react";

function TermsOfUseScreen() {
  return (
    <LegalDocumentViewer
      fetchDocument={getTermsOfUse}
      fallbackTitle="Terms of Use"
    />
  );
}

export default memo(TermsOfUseScreen);
