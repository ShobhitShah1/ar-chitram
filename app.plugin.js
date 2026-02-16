const { withAndroidManifest, withMainApplication, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withShareFileProvider(config) {
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      return config;
    }

    const application = manifest.application[0];
    const applicationId = config.android?.package || 'com.gigglam';

    // Ensure tools namespace exists
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Add MLKit Subject Segmentation meta-data for automatic model download
    const mlkitMetaData = {
      $: {
        'android:name': 'com.google.mlkit.vision.DEPENDENCIES',
        'android:value': 'subject_segment',
        'tools:replace': 'android:value',
      },
    };

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Check for existing MLKit metadata and remove/update it
    const existingMLKitIndex = application['meta-data'].findIndex(
      m => m.$['android:name'] === 'com.google.mlkit.vision.DEPENDENCIES'
    );

    if (existingMLKitIndex !== -1) {
      application['meta-data'][existingMLKitIndex] = mlkitMetaData;
    } else {
      application['meta-data'].push(mlkitMetaData);
    }

    const providerElement = {
      $: {
        'android:name': 'androidx.core.content.FileProvider',
        'android:authorities': `${applicationId}.provider`,
        'android:grantUriPermissions': 'true',
        'android:exported': 'false',
      },
      'meta-data': [{
        $: {
          'android:name': 'android.support.FILE_PROVIDER_PATHS',
          'android:resource': '@xml/filepaths',
        },
      }],
    };

    if (!application.provider) {
      application.provider = [];
    }
    
    const hasFileProvider = application.provider.some(
      p => p.$['android:name'] === 'androidx.core.content.FileProvider'
    );
    
    if (!hasFileProvider) {
      application.provider.push(providerElement);
    }

    return config;
  });

  config = withMainApplication(config, async (config) => {
    let mainApplicationFile = config.modResults.contents;
    
    // Add import for ShareApplication
    if (!mainApplicationFile.includes('cl.json.ShareApplication')) {
      const lines = mainApplicationFile.split('\n');
      let lastImportIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
          break;
        }
      }
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, 'import cl.json.ShareApplication');
        mainApplicationFile = lines.join('\n');
      }
    }

    // Update class declaration to implement ShareApplication
    if (mainApplicationFile.includes('class MainApplication : Application(), ReactApplication')) {
      mainApplicationFile = mainApplicationFile.replace(
        /class MainApplication : Application\(\), ReactApplication \{/,
        'class MainApplication : Application(), ReactApplication, ShareApplication {'
      );
    }

    // Add getFileProviderAuthority method before onConfigurationChanged
    if (!mainApplicationFile.includes('getFileProviderAuthority')) {
      const methodToAdd = `  override fun getFileProviderAuthority(): String {
    return BuildConfig.APPLICATION_ID + ".provider"
  }

  override fun `;
      
      if (mainApplicationFile.includes('override fun onConfigurationChanged')) {
        mainApplicationFile = mainApplicationFile.replace(
          /  override fun onConfigurationChanged/,
          methodToAdd + 'onConfigurationChanged'
        );
      }
    }

    config.modResults.contents = mainApplicationFile;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );

      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      const filePath = path.join(xmlDir, 'filepaths.xml');

      const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
  <cache-path name="share" path="." />
  <external-path name="downloads" path="Download/" />
  <external-cache-path name="external_cache" path="." />
</paths>`;

      fs.writeFileSync(filePath, xmlContent);

      return config;
    },
  ]);

  return config;
}

module.exports = withShareFileProvider;

