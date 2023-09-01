import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { viewport } from "@popperjs/core";
import {ProductService} from "@app/_services";
import {Products} from "@app/_models";

interface Produto {
  cProd: string;
  xProd: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
  cfop: string;
}

declare var $: any;



@Component({
  selector: 'app-notas-entrada',
  templateUrl: './notas-entrada.component.html',
  styleUrls: ['./notas-entrada.component.less']
})

export class NotasEntradaComponent implements OnInit {
  activeTab: string = 'consulta';
  @ViewChild('chNFeField', {static: false}) chNFeField!: ElementRef<HTMLInputElement>;
  @ViewChild('cUFField', {static: false}) cUFField!: ElementRef<HTMLInputElement>;
  @ViewChild('cNFField', {static: false}) cNFField!: ElementRef<HTMLInputElement>;
  @ViewChild('natOpField', {static: false}) natOpField!: ElementRef<HTMLInputElement>;
  @ViewChild('emitenteCNPJField', {static: false}) emitenteCNPJField!: ElementRef<HTMLInputElement>;
  @ViewChild('emitenteNomeField', {static: false}) emitenteNomeField!: ElementRef<HTMLInputElement>;
  @ViewChild('emitenteEnderecoField', {static: false}) emitenteEnderecoField!: ElementRef<HTMLInputElement>;
  @ViewChild('destinatarioCNPJField', {static: false}) destinatarioCNPJField!: ElementRef<HTMLInputElement>;
  @ViewChild('destinatarioCPFField', {static: false}) destinatarioCPFField!: ElementRef<HTMLInputElement>;
  @ViewChild('destinatarioNomeField', {static: false}) destinatarioNomeField!: ElementRef<HTMLInputElement>;
  @ViewChild('destinatarioEnderecoField', {static: false}) destinatarioEnderecoField!: ElementRef<HTMLInputElement>;
  @ViewChild('totalValorNFField', {static: false}) totalValorNFField!: ElementRef<HTMLInputElement>;
  @ViewChild('modFreteField', {static: false}) modFreteField!: ElementRef<HTMLInputElement>;
  @ViewChild('qVolField', {static: false}) qVolField!: ElementRef<HTMLInputElement>;
  @ViewChild('espField', {static: false}) espField!: ElementRef<HTMLInputElement>;
  @ViewChild('infAdicField', {static: false}) infAdicField!: ElementRef<HTMLInputElement>;
  @ViewChild('serieField', {static: false}) serieField!: ElementRef<HTMLInputElement>;
  @ViewChild('impostosValor', {static: false}) impostosValor!: ElementRef<HTMLInputElement>;
  @ViewChild('impostosDetalhadosField', {static: false}) impostosDetalhadosField!: ElementRef<HTMLInputElement>;
  selectedProduto: Produto | undefined;
  loadingPageModalVisible: boolean = false;
  lastProductCode: string = 'P000000';
  nextProductCode: string = '';
  precoVendaValue?: string;
  suggestResponse: any;

  produtos: Produto[] = [];
  modalSelectedProduto: any = {
    preco_venda: ''
  };
  precoVendaValueMultiple?: string;
  modalProdutosMultiple: any;


  constructor( private productService: ProductService) {
  }

  ngOnInit(): void {
  }

  isTabActive(tab: string): boolean {
    return this.activeTab === tab;
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // handleXmlUpload($event: Event) {
  //   const inputElement = $event.target as HTMLInputElement;
  //   const file = inputElement.files?.[0]; // Get the first selected file
  //
  //   if (file && file.type === 'text/xml') {
  //     const reader = new FileReader();
  //
  //     reader.onload = (e) => {
  //       const xmlContent = e.target?.result as string;
  //       // Aqui você pode realizar ações com o conteúdo do XML
  //       console.log('Conteúdo do XML:', xmlContent);
  //     };
  //
  //     reader.readAsText(file);
  //   } else {
  //     console.log('Por favor, selecione um arquivo XML válido.');
  //   }
  // }

  handleXmlUpload($event: Event) {
    const inputElement = $event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (file && file.type === 'text/xml') {
      const reader = new FileReader();

      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        this.parseXmlAndFillFields(xmlContent);
      };

      reader.readAsText(file);
    } else {
      console.log('Por favor, selecione um arquivo XML válido.');
    }
  }

  parseXmlAndFillFields(xmlContent: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Extrair a chave de acesso
    const chNFe = xmlDoc.querySelector('infProt chNFe')?.textContent;

    // Extrair informações do emitente
    const emitenteCNPJ = xmlDoc.querySelector('emit CNPJ')?.textContent;
    const emitenteNome = xmlDoc.querySelector('emit xNome')?.textContent;
    const emitenteEndereco = xmlDoc.querySelector('emit enderEmit xLgr')?.textContent;
    // Continue obtendo as informações de outros campos do emitente

    // Extrair informações do destinatário
    const destinatarioCNPJ = xmlDoc.querySelector('dest CNPJ')?.textContent;
    const destinatarioCPF = xmlDoc.querySelector('dest CPF')?.textContent;
    const destinatarioNome = xmlDoc.querySelector('dest xNome')?.textContent;
    const destinatarioEndereco = xmlDoc.querySelector('dest enderDest xLgr')?.textContent;
    // Continue obtendo as informações de outros campos do destinatário

    // Extrair informações do total
    const totalValorNF = xmlDoc.querySelector('total ICMSTot vNF')?.textContent;

    // Extrair informações da transportadora
    const modFrete = xmlDoc.querySelector('transp modFrete')?.textContent;
    const qVol = xmlDoc.querySelector('transp vol qVol')?.textContent;
    const esp = xmlDoc.querySelector('transp vol esp')?.textContent;
    const cUF = xmlDoc.querySelector('ide cUF')?.textContent;
    const cNF = xmlDoc.querySelector('ide cNF')?.textContent;
    const natOp = xmlDoc.querySelector('ide natOp')?.textContent;
    const serie = xmlDoc.querySelector('ide serie')?.textContent;
    const impostosTotaisElement = xmlDoc.querySelector('ICMSTot');
    const valorImpostosElement = impostosTotaisElement?.querySelector('vTotTrib');
    const vPIS = xmlDoc.querySelector('ICMSTot vPIS')?.textContent;
    const vCOFINS = xmlDoc.querySelector('ICMSTot vCOFINS')?.textContent;
    const valorImpostos = parseFloat(vPIS || '0') + parseFloat(vCOFINS || '0.00');
    const icmsValor = xmlDoc.querySelector('total ICMSTot vICMS')?.textContent || '0.00';
    const pisValor = xmlDoc.querySelector('total ICMSTot vPIS')?.textContent || '0.00';
    const cofinsValor = xmlDoc.querySelector('total ICMSTot vCOFINS')?.textContent || '0.00';

    // Criar string com valores detalhados dos impostos
    const impostosDetalhados = `ICMS: R$ ${icmsValor}\nPIS: R$ ${pisValor}\nCOFINS: R$ ${cofinsValor}`;


    // Extrair informações adicionais
    const infAdic = xmlDoc.querySelector('infAdic infCpl')?.textContent;

    // Preencher os campos com as informações extraídas
    if (this.chNFeField) {
      this.chNFeField.nativeElement.value = chNFe || '';
    }
    if (this.cUFField) {
      this.cUFField.nativeElement.value = cUF || '';
    }
    if (this.cNFField) {
      this.cNFField.nativeElement.value = cNF || '';
    }
    if (this.natOpField) {
      this.natOpField.nativeElement.value = natOp || '';
    }
    if (this.emitenteCNPJField) {
      this.emitenteCNPJField.nativeElement.value = emitenteCNPJ || '';
    }
    if (this.emitenteNomeField) {
      this.emitenteNomeField.nativeElement.value = emitenteNome || '';
    }
    if (this.emitenteEnderecoField) {
      this.emitenteEnderecoField.nativeElement.value = emitenteEndereco || '';
    }
    // Continue preenchendo os outros campos do emitente
    if (this.destinatarioCPFField) {
      this.destinatarioCPFField.nativeElement.value = destinatarioCPF || '';
    }
    if (this.destinatarioCNPJField) {
      this.destinatarioCNPJField.nativeElement.value = destinatarioCNPJ || '';
    }
    if (this.destinatarioNomeField) {
      this.destinatarioNomeField.nativeElement.value = destinatarioNome || '';
    }
    if (this.destinatarioEnderecoField) {
      this.destinatarioEnderecoField.nativeElement.value = destinatarioEndereco || '';
    }
    // Continue preenchendo os outros campos do destinatário

    if (this.totalValorNFField) {
      this.totalValorNFField.nativeElement.value = totalValorNF || '';
    }

    if (this.modFreteField) {
      this.modFreteField.nativeElement.value = modFrete || '';
    }
    if (this.qVolField) {
      this.qVolField.nativeElement.value = qVol || '';
    }
    if (this.espField) {
      this.espField.nativeElement.value = esp || '';
    }
    // Continue preenchendo os outros campos da transportadora

    if (this.infAdicField) {
      this.infAdicField.nativeElement.value = infAdic || '';
    }

    if (this.serieField) {
      this.serieField.nativeElement.value = serie || '';
    }

    if (this.impostosValor) {
      this.impostosValor.nativeElement.value = String(valorImpostos) || '';
    }

    if (this.impostosDetalhadosField) {
      this.impostosDetalhadosField.nativeElement.value = impostosDetalhados;
    }


    // Extrair detalhes dos produtos
    const produtos: Produto[] = [];
    const detElements = xmlDoc.querySelectorAll('det');
    detElements.forEach((detElement, index) => {
      console.log(`Parsing details for product ${index + 1}`);

      const prodElement = detElement.querySelector('prod');
      if (prodElement) {
        console.log('Product element found:', prodElement);

        const produto: Produto = {
          cProd: prodElement.querySelector('cProd')?.textContent || '',
          xProd: prodElement.querySelector('xProd')?.textContent || '',
          qCom: prodElement.querySelector('qCom')?.textContent || '',
          vUnCom: prodElement.querySelector('vUnCom')?.textContent || '',
          vProd: prodElement.querySelector('vProd')?.textContent || '',
          cfop: prodElement.querySelector('CFOP')?.textContent || ''
        };
        produtos.push(produto);
      } else {
        console.log('No product element found for this DET element:', detElement);
      }
    });

    console.log('Extracted products:', produtos);
    this.preencherCNPJSeVazio();

    // Preencher os campos da tabela com os detalhes dos produtos
    this.produtos = produtos;
  }

  preencherCNPJSeVazio() {
    if (!this.destinatarioCNPJField) {
      this.destinatarioCNPJField = this.destinatarioCPFField;
    }
  }

  openModal(produto: Produto) {
    this.loadingPageModalVisible = true;
    this.modalSelectedProduto = produto; // Atualiza a propriedade modalSelectedProduto
    this.getLastProductCode(); // Chama para obter o último código
  }



  fecharModal() {
    $('#produtoModal').modal('hide');
    $('#produtoModalTodos').modal('hide');
  }

  abrirModalTodos() {
    this.loadingPageModalVisible = true;
    this.getLastProductCodeMultiple(); // Chama para obter o último código
    $('#produtoModalTodos').modal('show');
    this.loadingPageModalVisible = false;
  }

  // Certifique-se de definir a variável suggestResponse com a resposta da API antes de usá-la no código abaixo

  getLastProductCode() {
    const isProductDefault = 1;

    this.productService.getLastCode(isProductDefault).subscribe((response: any) => {
      if (response && response.produto && response.produto[2]) {
        this.lastProductCode = response.produto[2];
      } else {
        this.lastProductCode = 'P000001';
      }

      if (this.modalSelectedProduto) {
        let productCodeToUse = ''; // Inicializar com um valor vazio

        this.productService.suggestPrice(this.modalSelectedProduto.xProd).subscribe((suggestResponse: any) => {
          console.log('suggestResponse:', suggestResponse);

          if (suggestResponse && suggestResponse.mensagem === "Produto localizado com sucesso!") {
            if (typeof suggestResponse.suggested_price === 'number') {
              this.precoVendaValue = suggestResponse.suggested_price.toFixed(2);
            } else {
              this.precoVendaValue = '0.00';
            }

            if (suggestResponse.product_code) {
              productCodeToUse = suggestResponse.product_code; // Armazena o product_code
            } else {
              productCodeToUse = this.generateNextCode(); // Gera um novo código apenas quando não há product_code
            }
          } else {
            this.precoVendaValue = '0.00';
            productCodeToUse = this.generateNextCode(); // Gera um novo código
          }

          console.log('Código do produto alterado para:', productCodeToUse);

          // Armazena o productCodeToUse no modalSelectedProduto somente para o modal
          this.modalSelectedProduto.modalCProd = productCodeToUse;

          console.log('Updated modalSelectedProduto:', this.modalSelectedProduto);
          console.log('precoVendaValue:', this.precoVendaValue);

          $('#produtoModal').modal('show');
          this.loadingPageModalVisible = false;
        });
      }
    });
  }


  getLastProductCodeMultiple() {
    const isProductDefault = 1;

    this.productService.getLastCode(isProductDefault).subscribe((response: any) => {
      if (response && response.produto && response.produto[2]) {
        this.lastProductCode = response.produto[2];
      } else {
        this.lastProductCode = 'P000001';
      }

      let nextNumericPart = parseInt(this.lastProductCode.substring(1), 10);

      // Criar uma cópia dos produtos para o modal
      this.modalProdutosMultiple = this.produtos.map(produto => ({ ...produto }));

      const getProductCode = (suggestResponse: { mensagem: string; suggested_price: number; product_code: string; }) => {
        if (suggestResponse && suggestResponse.mensagem === "Produto localizado com sucesso!") {
          this.precoVendaValueMultiple = suggestResponse.suggested_price.toFixed(2);

          if (suggestResponse.product_code) {
            return suggestResponse.product_code;
          } else {
            nextNumericPart++;
            return `P${nextNumericPart.toString().padStart(6, '0')}`;
          }
        } else {
          this.precoVendaValueMultiple = '0.00';
          nextNumericPart++;
          return `P${nextNumericPart.toString().padStart(6, '0')}`;
        }
      };

      const processNextProduct = (index: number) => {
        if (index < this.modalProdutosMultiple.length) {
          const currentProduct = this.modalProdutosMultiple[index];
          this.productService.suggestPrice(currentProduct.xProd).subscribe((suggestResponse: any) => {
            currentProduct.cProd = getProductCode(suggestResponse);
            processNextProduct(index + 1); // Processar o próximo produto
          });
        } else {
          console.log('Modal produtos (Multiple):', this.modalProdutosMultiple);
          console.log('precoVendaValue (Multiple):', this.precoVendaValueMultiple);

          $('#produtoModalTodos').modal('show');
          this.loadingPageModalVisible = false;
        }
      };

      processNextProduct(0); // Iniciar o processamento do primeiro produto
    });
  }



  generateNextCode(): string {
    const prefix = this.lastProductCode.charAt(0);
    const numericPart = parseInt(this.lastProductCode.substring(1), 10);
    const newNumericPart = numericPart + 1;
    const newFormattedCode = `${prefix}${newNumericPart.toString().padStart(6, '0')}`;

    return newFormattedCode;
  }


  protected readonly Number = Number;
}
