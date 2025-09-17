interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  selectedModifiers?: {
    inventory_item: {
      name: string;
      cost_per_unit: number;
    };
    quantity: number;
  }[];
}

interface ReceiptData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: 'cash' | 'card';
  customerName?: string;
  cashier: string;
  timestamp: Date;
  receiptNumber: string;
}

export class ReceiptPrinter {
  private static instance: ReceiptPrinter;
  private autoPrintEnabled = true;

  static getInstance(): ReceiptPrinter {
    if (!ReceiptPrinter.instance) {
      ReceiptPrinter.instance = new ReceiptPrinter();
    }
    return ReceiptPrinter.instance;
  }

  setAutoPrint(enabled: boolean) {
    this.autoPrintEnabled = enabled;
  }

  getAutoPrint(): boolean {
    return this.autoPrintEnabled;
  }

  private formatReceiptText(data: ReceiptData): string {
    const lines: string[] = [];
    
    // Header
    lines.push('========================================');
    lines.push(`        ${data.storeName.toUpperCase()}`);
    lines.push(`        ${data.storeAddress}`);
    lines.push(`        ${data.storePhone}`);
    lines.push('========================================');
    lines.push('');
    
    // Receipt info
    lines.push(`Receipt #: ${data.receiptNumber}`);
    lines.push(`Date: ${data.timestamp.toLocaleDateString()}`);
    lines.push(`Time: ${data.timestamp.toLocaleTimeString()}`);
    lines.push(`Cashier: ${data.cashier}`);
    if (data.customerName) {
      lines.push(`Customer: ${data.customerName}`);
    }
    lines.push('----------------------------------------');
    
    // Items
    data.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      lines.push(`${item.name}`);
      lines.push(`  ${item.quantity} x $${item.price.toFixed(2)} = $${itemTotal.toFixed(2)}`);
      
      // Modifiers
      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        item.selectedModifiers.forEach(modifier => {
          const modifierCost = modifier.inventory_item.cost_per_unit * modifier.quantity;
          lines.push(`    + ${modifier.inventory_item.name} x${modifier.quantity} (+$${modifierCost.toFixed(2)})`);
        });
      }
      lines.push('');
    });
    
    lines.push('----------------------------------------');
    lines.push(`TOTAL: $${data.total.toFixed(2)}`);
    lines.push(`Payment Method: ${data.paymentMethod.toUpperCase()}`);
    lines.push('========================================');
    lines.push('');
    lines.push('        Thank you for your visit!');
    lines.push('========================================');
    
    return lines.join('\n');
  }

  async printReceipt(data: ReceiptData): Promise<boolean> {
    if (!this.autoPrintEnabled) {
      console.log('Auto-print disabled');
      return false;
    }

    const receiptText = this.formatReceiptText(data);
    
    try {
      // Check if Web Serial API is supported (for actual printer connection)
      if ('serial' in navigator) {
        return await this.printWithSerial(receiptText);
      } else {
        // Fallback to browser printing
        return this.printWithBrowser(receiptText);
      }
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }

  private async printWithSerial(receiptText: string): Promise<boolean> {
    try {
      // This would be for actual thermal printer connection
      // For demo purposes, we'll use browser print
      console.log('Serial printing not implemented, falling back to browser print');
      return this.printWithBrowser(receiptText);
    } catch (error) {
      console.error('Serial print error:', error);
      return false;
    }
  }

  private printWithBrowser(receiptText: string): boolean {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;

      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 20px;
                white-space: pre-wrap;
              }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      return true;
    } catch (error) {
      console.error('Browser print error:', error);
      return false;
    }
  }

  generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `R${timestamp.toString().slice(-6)}${random}`;
  }
}

export const receiptPrinter = ReceiptPrinter.getInstance();