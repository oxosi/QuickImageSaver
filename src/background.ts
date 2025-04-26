// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="chrome" />

// Constants
const DEFAULT_FOLDER = '%USERPROFILE%\\Desktop';
const STORAGE_KEY_SAVE_LOCATION = 'saveLocation';
const STORAGE_KEY_USER_PROFILE = 'userProfilePath'; // ユーザープロファイルパスの保存キー
// ユーザープロファイルパス（実際のユーザープロファイルを取得する前の初期値）
let userProfilePath = '';

// 初回ダウンロード用のダミーファイルURL（1x1の透明PNG）
const DUMMY_FILE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ダウンロード検出用のフラグ（検出中は新しいダウンロードを開始しない）
let isDetectingUserProfile = false;
// プロファイル検出が成功したかどうかのフラグ
let profileDetectionSucceeded = false;

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("QuickImageSaver extension installed");
  
  // テスト用のコンテキストメニューを作成
  chrome.contextMenus.create({
    id: "testDownloads",
    title: "ダウンロード方法をテスト",
    contexts: ["all"]
  });

  // テスト用のダウンロードメソッドメニューを作成
  chrome.contextMenus.create({
    id: "test_download_methods",
    title: "テスト：ダウンロード方法テスト",
    contexts: ["all"]
  });
  
  // デスクトップパスの取得方法をテスト
  const specialFolders = ["Desktop", "Downloads", "Documents", "Pictures"];
  specialFolders.forEach(folder => {
    console.log(`Testing path for ${folder}: ${folder}/test.txt`);
  });
  
  // ユーザープロファイルパスの初期化（保存されている場合は読み込み、なければ検出）
  initializeUserProfilePath();
});

// コンテキストメニュークリック時の処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "testDownloads") {
    testDownload();
  } else if (info.menuItemId === "test_download_methods") {
    console.log("==== ダウンロード方法テスト開始 ====");
    testDownload();
  }
});

// 拡張機能起動時にもユーザープロファイルパスを確認
chrome.runtime.onStartup.addListener(() => {
  // 保存されたプロファイルパスを読み込む
  initializeUserProfilePath();
});

// ユーザープロファイルパスの初期化関数
function initializeUserProfilePath() {
  // ローカルストレージからユーザープロファイルパスを読み込む
  chrome.storage.local.get([STORAGE_KEY_USER_PROFILE], (result) => {
    if (result[STORAGE_KEY_USER_PROFILE]) {
      // 保存されている値があれば、それを使用
      userProfilePath = result[STORAGE_KEY_USER_PROFILE];
      profileDetectionSucceeded = true;
      console.log('保存されていたユーザープロファイルパスを読み込みました:', userProfilePath);
    } else {
      // 保存されていない場合、検出を実行
      console.log('保存されたユーザープロファイルパスがないため、検出を開始します');
      detectUserProfilePath();
    }
  });
}

// ユーザープロファイルパスを検出する関数
function detectUserProfilePath() {
  // 既に検出に成功していれば二度と実行しない
  if (profileDetectionSucceeded && userProfilePath) {
    console.log('プロファイルパス検出は既に成功しています:', userProfilePath);
    return false;
  }
  
  // 既に検出中の場合は重複実行しない
  if (isDetectingUserProfile) {
    console.log('プロファイルパス検出は既に実行中です');
    return false;
  }
  
  // 検出開始
  isDetectingUserProfile = true;
  
  // デフォルトダウンロードフォルダにダミーファイルをダウンロード
  chrome.downloads.download({
    url: DUMMY_FILE_URL,
    filename: 'profile_detect.tmp',
    conflictAction: 'uniquify'
  }, (downloadId) => {
    if (downloadId) {
      console.log('Detecting user profile path...');
      
      // ダウンロードが完了するのを少し待ってから処理
      setTimeout(() => {
        chrome.downloads.search({id: downloadId}, (results) => {
          if (results && results.length > 0 && results[0].filename) {
            const fullPath = results[0].filename;
            console.log('Downloaded file path:', fullPath);
            
            // Windowsパスからユーザープロファイルパスを抽出（C:\Users\実際のユーザー名）
            const match = fullPath.match(/^([A-Z]:\\Users\\[^\\]+)/i);
            if (match && match[1]) {
              userProfilePath = match[1];
              console.log('User profile path detected:', userProfilePath);
              saveUserProfilePath(userProfilePath); // 検出結果を保存
              profileDetectionSucceeded = true; // 検出成功フラグをセット
            } else {
              // バックアップ方法：Downloads フォルダから推測
              const downloadsMatch = fullPath.match(/^([A-Z]:.+)\\Downloads/i);
              if (downloadsMatch && downloadsMatch[1]) {
                userProfilePath = downloadsMatch[1];
                console.log('User profile path from Downloads:', userProfilePath);
                saveUserProfilePath(userProfilePath); // 検出結果を保存
                profileDetectionSucceeded = true; // 検出成功フラグをセット
              } else {
                // 最終手段：ファイルパスから2階層上を取得
                const parts = fullPath.split('\\');
                if (parts.length >= 3) {
                  userProfilePath = parts.slice(0, 3).join('\\');
                  console.log('User profile path fallback:', userProfilePath);
                  saveUserProfilePath(userProfilePath); // 検出結果を保存
                  profileDetectionSucceeded = true; // 検出成功フラグをセット
                }
              }
            }
            
            // 一時ファイルを削除
            chrome.downloads.removeFile(downloadId);
            chrome.downloads.erase({id: downloadId});
            
            // 検出完了フラグを設定
            isDetectingUserProfile = false;
          }
        });
      }, 1000); // 1秒待機
    } else {
      // ダウンロードが開始できなかった場合はフラグをリセット
      isDetectingUserProfile = false;
    }
  });
  
  return true; // 検出を開始した場合はtrueを返す
}

// ユーザープロファイルパスをローカルストレージに保存する関数
function saveUserProfilePath(path: string) {
  if (path) {
    chrome.storage.local.set({ [STORAGE_KEY_USER_PROFILE]: path }, () => {
      console.log('ユーザープロファイルパスを保存しました:', path);
    });
  }
}

// 画像ファイルを直接開いている場合のダブルクリックイベントを処理
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // URLが画像ファイルと思われる場合
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(tab.url)) {
      // そのタブに対してコンテンツスクリプトを実行
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: injectImageViewerListener,
        args: [tab.url]
      }).catch(err => console.error('画像ビューワーへのスクリプト挿入エラー:', err));
    }
  }
});

// 画像ビューワーページにイベントリスナーを注入する関数
function injectImageViewerListener(imageUrl: string) {
  console.log('画像ビューワーにリスナーを注入します:', imageUrl);
  
  // 画像要素にダブルクリックイベントリスナーを追加
  const imgElement = document.querySelector('img');
  if (imgElement) {
    imgElement.addEventListener('dblclick', () => {
      console.log('画像がダブルクリックされました');
      chrome.runtime.sendMessage({
        action: 'saveImage',
        imageUrl: imageUrl
      });
    });
    
    console.log('画像要素にダブルクリックリスナーを追加しました');
  } else {
    console.warn('画像要素が見つかりませんでした');
  }
}

// Listen for messages from content script or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveImage") {
    console.log("Received save image request for URL:", message.imageUrl);
    saveImage(message.imageUrl);
    sendResponse({success: true});
    return true;
  }
  return false;
});

// 画像を保存する
function saveImage(imageUrl: string) {
  console.log("保存する画像URL:", imageUrl);
  
  try {
    // 画像URLからファイル名を取得
    const filename = getFilenameFromUrl(imageUrl);
    console.log("ファイル名:", filename);
    
    // ダウンロードを実行（デフォルトのダウンロードフォルダに保存）
    executeDownload(imageUrl, filename);
  } catch (error) {
    console.error("画像保存中にエラーが発生しました:", error);
  }
}

// ダウンロードを実行する
function executeDownload(imageUrl: string, filename: string) {
  console.log(`ダウンロード実行: ${imageUrl} を ${filename} として保存します`);
  
  // Chrome API でダウンロード
  chrome.downloads.download({
    url: imageUrl,
    filename: filename,
    conflictAction: 'uniquify'
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('ダウンロードAPIエラー:', chrome.runtime.lastError);
      
      // エラーの場合、ファイル名だけでリトライ（強制的にダイアログ表示）
      console.log('エラー発生のため、保存ダイアログを表示してリトライします');
      chrome.downloads.download({
        url: imageUrl,
        saveAs: true, // 常にダイアログ表示
        conflictAction: 'uniquify'
      }, (retryId) => {
        if (chrome.runtime.lastError) {
          console.error('リトライ失敗:', chrome.runtime.lastError);
        } else {
          console.log('リトライ成功, ID:', retryId);
          watchDownloadCompletion(retryId, "リトライ");
        }
      });
    } else if (downloadId) {
      console.log('ダウンロード開始, ID:', downloadId);
      watchDownloadCompletion(downloadId, "通常");
    } else {
      console.warn('ダウンロードIDが取得できませんでした');
    }
  });
}

// ダウンロードの完了を監視する関数
function watchDownloadCompletion(downloadId: number, methodName: string) {
  chrome.downloads.search({id: downloadId}, (results) => {
    if (results.length > 0) {
      const download = results[0];
      console.log(`${methodName} ダウンロード情報:`, {
        filename: download.filename,
        state: download.state,
        url: download.url
      });
      
      // 完了していない場合は完了を待つ
      if (download.state !== "complete") {
        chrome.downloads.onChanged.addListener(function listener(delta) {
          if (delta.id === downloadId && delta.state?.current === "complete") {
            chrome.downloads.search({id: downloadId}, (updatedResults) => {
              if (updatedResults.length > 0) {
                console.log(`${methodName} ダウンロード完了:`, {
                  filename: updatedResults[0].filename,
                  url: updatedResults[0].url
                });
              }
            });
            chrome.downloads.onChanged.removeListener(listener);
          }
        });
      }
    }
  });
}

// コンピューター名からユーザー名を推測する関数
function getComputedUsername() {
  // Chromeではnavigator.userAgentからコンピューター名を取得できる場合がある
  const userAgent = navigator.userAgent;
  
  // 現在のタイムスタンプを使用
  const timestamp = new Date().getTime().toString(36);
  
  return `User_${timestamp.substr(-4)}`;
}

// 画像情報の型定義
interface ImageInfo {
  url: string;
  pageUrl?: string;
  title?: string;
  width?: number;
  height?: number;
}

// URLからファイル名を取得する関数
function getFilenameFromUrl(url: string): string {
  try {
    // データURLの場合はMIMEタイプから拡張子を推測
    if (url.startsWith('data:')) {
      const mimeMatch = url.match(/^data:([a-z]+)\/([a-z0-9.\-+]+);base64,/i);
      if (mimeMatch && mimeMatch[1] === 'image') {
        const subtype = mimeMatch[2].toLowerCase();
        const extension = getExtensionFromMimeSubtype(subtype);
        return `image${Date.now()}.${extension}`;
      }
      return `image${Date.now()}.png`; // デフォルトはpng
    }

    try {
      // URLオブジェクトを生成
      const urlObj = new URL(url);
      
      // パス部分を取得し、最後のスラッシュ以降をファイル名として扱う
      const path = urlObj.pathname;
      let filename = path.substring(path.lastIndexOf('/') + 1);
      
      // URLデコード（日本語対応のため）
      try {
        // すでにデコードされている可能性があるため、安全にデコード
        const decodedOnce = decodeURIComponent(filename);
        // 2回デコードしても変わらなければOK、変わる場合は元の値を使用
        const decodedTwice = decodeURIComponent(decodedOnce);
        filename = (decodedOnce === decodedTwice) ? decodedOnce : filename;
      } catch (e) {
        console.warn('ファイル名のデコードに失敗:', e);
        // デコード失敗時はそのまま
      }
      
      // クエリパラメータや余分な情報を除去
      if (filename.includes('?')) {
        filename = filename.substring(0, filename.indexOf('?'));
      }
      if (filename.includes('#')) {
        filename = filename.substring(0, filename.indexOf('#'));
      }

      // ファイル名が空の場合や、拡張子がない場合は適切な拡張子を付加
      if (!filename || filename === '') {
        const extension = guessImageExtension(url);
        return `image${Date.now()}.${extension}`;
      }

      // ファイル名に拡張子がない場合は、URLから推測した拡張子を追加
      if (!filename.includes('.')) {
        const extension = guessImageExtension(url);
        return `${filename}.${extension}`;
      }
      
      return filename;
    } catch (urlError) {
      console.warn('URLパース失敗:', urlError);
      
      // URL解析に失敗した場合、スラッシュで分割して最後の部分を使用
      const parts = url.split('/');
      let filename = parts[parts.length - 1];
      
      // クエリパラメータがあれば削除
      if (filename.includes('?')) {
        filename = filename.substring(0, filename.indexOf('?'));
      }
      
      if (filename && filename !== '') {
        return filename;
      }
    }
    
    // どの方法でも取得できなかった場合はタイムスタンプ付きのデフォルト名
    return `image${Date.now()}.png`;
  } catch (e) {
    console.warn('URLからファイル名を抽出できませんでした:', e);
    // 失敗した場合は現在のタイムスタンプを使用したデフォルト名
    return `image${Date.now()}.png`;
  }
}

// MIMEタイプから適切な拡張子を取得する関数
function getExtensionFromMimeSubtype(subtype: string): string {
  const mimeToExtensionMap: {[key: string]: string} = {
    'jpeg': 'jpg',
    'jpg': 'jpg',
    'png': 'png',
    'gif': 'gif',
    'webp': 'webp',
    'svg+xml': 'svg',
    'bmp': 'bmp',
    'x-icon': 'ico',
    'tiff': 'tiff',
    'avif': 'avif'
  };

  return mimeToExtensionMap[subtype] || 'png'; // 対応する拡張子がない場合はpng
}

// 画像URLから拡張子を推測する関数
function guessImageExtension(url: string): string {
  // データURLの場合はMIMEタイプから判断
  if (url.startsWith('data:')) {
    if (url.startsWith('data:image/jpeg')) return 'jpg';
    if (url.startsWith('data:image/png')) return 'png';
    if (url.startsWith('data:image/gif')) return 'gif';
    if (url.startsWith('data:image/webp')) return 'webp';
    if (url.startsWith('data:image/svg+xml')) return 'svg';
    if (url.startsWith('data:image/bmp')) return 'bmp';
    if (url.startsWith('data:image/avif')) return 'avif';
    // MIMEタイプが判別できない場合はデフォルトのpng
    return 'png';
  }

  // Content-Typeやファイル名から推測できる場合はその情報を使用
  // URLのパターンからファイル形式を推測
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) {
    return 'jpg';
  } else if (lowerUrl.includes('.png')) {
    return 'png';
  } else if (lowerUrl.includes('.gif')) {
    return 'gif';
  } else if (lowerUrl.includes('.webp')) {
    return 'webp';
  } else if (lowerUrl.includes('.svg')) {
    return 'svg';
  } else if (lowerUrl.includes('.bmp')) {
    return 'bmp';
  } else if (lowerUrl.includes('.avif')) {
    return 'avif';
  } else if (lowerUrl.includes('.ico')) {
    return 'ico';
  } else if (lowerUrl.includes('.tiff') || lowerUrl.includes('.tif')) {
    return 'tiff';
  }
  
  // 最後の手段：拡張子がURLから判断できない場合はHTTPリクエストのContent-Typeを確認
  // 注：非同期処理になるためこの関数ではできないが、別の場所で処理する
  // デフォルトはpng
  return 'png';
}

// ファイル名をサニタイズする関数（Windowsの禁止文字を除去）
function sanitizeFilename(filename: string): string {
  // Windowsで使用できない文字を置き換え
  return filename
    .replace(/[<>:"\/\\|?*]/g, '_') // 禁止文字をアンダースコアに置換
    .replace(/\s+/g, ' ')          // 連続する空白を単一の空白に置換
    .trim();                        // 先頭と末尾の空白を削除
}

// 単純なダウンロードテスト
function testDownload() {
  const testUrl = "https://via.placeholder.com/150";
  
  chrome.downloads.download({
    url: testUrl,
    filename: "test-download.png",
    conflictAction: "uniquify"
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error("ダウンロードエラー:", chrome.runtime.lastError);
    } else {
      console.log(`ダウンロード開始: ID=${downloadId}`);
    }
  });
}