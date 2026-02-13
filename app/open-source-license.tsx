import LegalDocumentViewer from "@/components/legal-document-viewer";
import { getLibraryLicense } from "@/services/api-service";
import React, { memo } from "react";

function OpenSourceLicenseScreen() {
  return (
    <LegalDocumentViewer
      fetchDocument={getLibraryLicense}
      fallbackTitle="Open Source Licenses"
    />
  );
}

export default memo(OpenSourceLicenseScreen);
