import { CustomerDeal, DealStatus } from '../types';

export const SHEET_HEADERS = [
  'วันที่บันทึก (Date & Time)',
  'LINE User ID',
  'ชื่อลูกค้า LINE (Customer Name)',
  'สถานะการขาย (Sales Status)',
  'แท็กทั้งหมด (LINE OA Tags)',
  'ยอดเงิน (฿ Amount)',
  'สินค้า/บริการ (Product)',
  'แอดมินผู้ดูแล (Sales Rep)',
  'ข้อความล่าสุด (Latest Message)',
  'บันทึกเพิ่มเติม (Notes)',
  'อัปเดตล่าสุด (Last Updated)',
];

export const formatStatusThai = (status: DealStatus): string => {
  switch (status) {
    case 'WON':
      return '🟢 ปิดการขายสำเร็จ (Closed Won)';
    case 'LOST':
      return '🔴 ขายไม่เสร็จ / หลุด (Closed Lost)';
    case 'IN_PROGRESS':
      return '🟡 กำลังติดตาม (In Progress)';
    case 'UNTAGGED':
      return '⚪ ยังไม่ติดแท็ก (Untagged)';
    default:
      return status;
  }
};

export const dealToRowValues = (deal: CustomerDeal): (string | number)[] => {
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  return [
    deal.syncedAt ? new Date(deal.syncedAt).toLocaleString('th-TH') : now,
    deal.lineUserId,
    deal.displayName,
    formatStatusThai(deal.status),
    deal.tags.join(', '),
    deal.amount || 0,
    deal.product || '-',
    deal.adminName || 'Admin',
    deal.lastMessage || '-',
    deal.notes || '-',
    new Date(deal.updatedAt).toLocaleString('th-TH'),
  ];
};

/**
 * Creates a new tracking Google Spreadsheet with styled headers & freeze pane
 */
export async function createTrackingSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ spreadsheetId: string; url: string; sheetName: string; title: string }> {
  const sheetTitle = 'LINE_OA_Sales_Tracking';

  const requestBody = {
    properties: {
      title: title || `LINE OA Sales & Tag Tracker - ${new Date().toISOString().split('T')[0]}`,
    },
    sheets: [
      {
        properties: {
          title: sheetTitle,
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 500,
            columnCount: 11,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: SHEET_HEADERS.map((header) => ({
                  userEnteredValue: { stringValue: header },
                  userEnteredFormat: {
                    backgroundColor: { red: 0.04, green: 0.35, blue: 0.22 }, // Dark emerald
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      fontSize: 10,
                    },
                    horizontalAlignment: 'CENTER',
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `สร้าง Google Sheet ไม่สำเร็จ (${response.status})`
    );
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    url,
    sheetName: sheetTitle,
    title: result.properties?.title || title,
  };
}

/**
 * Checks access and returns metadata for an existing Google Sheet
 */
export async function verifySpreadsheet(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: string[]; primarySheet: string }> {
  // Clean id if full URL is passed
  const cleanId = spreadsheetId.includes('/d/')
    ? spreadsheetId.split('/d/')[1].split('/')[0]
    : spreadsheetId.trim();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `ไม่สามารถเข้าถึง Google Sheet ID นี้ได้ โปรดตรวจสอบสิทธิ์และการแชร์ (${response.status})`
    );
  }

  const data = await response.json();
  const title = data.properties?.title || 'Google Sheet';
  const sheets: string[] = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  const primarySheet = sheets[0] || 'Sheet1';

  return { title, sheets, primarySheet };
}

/**
 * Ensures header row exists in the targeted sheet
 */
export async function ensureSheetHeaders(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<void> {
  const range = `${sheetName}!A1:K1`;
  const checkRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (checkRes.ok) {
    const data = await checkRes.json();
    if (data.values && data.values.length > 0 && data.values[0].length >= 3) {
      // Headers already present
      return;
    }
  }

  // Write headers
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [SHEET_HEADERS],
      }),
    }
  );
}

/**
 * Appends a deal to Google Sheets in real time
 */
export async function appendDealToSheet(
  spreadsheetId: string,
  sheetName: string,
  deal: CustomerDeal,
  accessToken: string
): Promise<{ updatedRange: string; rowNumber: number }> {
  const range = `${sheetName}!A:K`;
  const rowValues = dealToRowValues(deal);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `เกิดข้อผิดพลาดในการส่งข้อมูลไปที่ Google Sheet (${response.status})`
    );
  }

  const result = await response.json();
  const updatedRange = result.updates?.updatedRange || '';
  // parse row number from updatedRange like 'Sheet1!A15:K15'
  const match = updatedRange.match(/!A(\d+)/);
  const rowNumber = match ? parseInt(match[1], 10) : 0;

  return { updatedRange, rowNumber };
}

/**
 * Updates a specific row in the Sheet
 */
export async function updateDealInSheet(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  deal: CustomerDeal,
  accessToken: string
): Promise<void> {
  const range = `${sheetName}!A${rowNumber}:K${rowNumber}`;
  const rowValues = dealToRowValues(deal);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `อัปเดตแถวใน Sheet ไม่สำเร็จ (${response.status})`
    );
  }
}

/**
 * Batch sync multiple deals to the Google Sheet
 */
export async function batchSyncDeals(
  spreadsheetId: string,
  sheetName: string,
  deals: CustomerDeal[],
  accessToken: string
): Promise<number> {
  await ensureSheetHeaders(spreadsheetId, sheetName, accessToken);

  const values = deals.map((d) => dealToRowValues(d));
  const range = `${sheetName}!A2:K${values.length + 1}`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `ซิงค์ข้อมูลชุดใหญ่ไปยัง Google Sheet ไม่สำเร็จ (${response.status})`
    );
  }

  return values.length;
}
