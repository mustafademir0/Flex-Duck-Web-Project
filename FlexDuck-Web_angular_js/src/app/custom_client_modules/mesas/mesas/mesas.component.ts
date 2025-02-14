import {AfterContentChecked, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {map} from "rxjs";
import {Bandeiras, Company, Paytype, Products} from "@app/_models";
import {CompanySettingsService, FuncPaymentsService, ProductService, SalesService, UserService} from "@app/_services";
import { Pipe, PipeTransform } from '@angular/core';
import {JwtHelperService} from "@auth0/angular-jwt";
import {NgbModalRef} from "@ng-bootstrap/ng-bootstrap";
import {MesasLocalstorageService} from "@app/_services/mesas.localstorage.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";


interface Produto {
  codigo: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface ProdutoConsumido {
  codigo: string;
  nome: string;
  quantidade: number;
  preco: number;
}

interface Mesa {
  id: number;
  numero: number;
  nome: string;
  telefoneResponsavel: string;
  produtosConsumidos: Produto[];
  totalAPagar: number;
  abertura: Date;
  tempoAberta: Date;
  iniciado: boolean;
  tempoInicial: number;
  tempoTotal: number;
}

interface Cliente {
  nome: string;
  telefone: string;
}

@Pipe({
  name: 'filter',
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string): any[] {
    if (!items || !searchText || !searchText.trim()) {
      return items;
    }

    searchText = searchText.toLowerCase();

    return items.filter((item) => {
      const keys = Object.keys(item);
      return keys.some(
        (key) =>
          item[key] && item[key].toString().toLowerCase().includes(searchText)
      );
    });
  }
}

@Component({
  selector: 'app-mesas',
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.less'],
})
export class MesasComponent implements OnInit, AfterContentChecked {
  public alertMesa: boolean = false;
  public alertDesconto: string = '';
  modalSenhaVisivel_val = false;
  modalSenhaVisivel_perc = false;
  modalNovaMesaVisivel = false;
  mesasAbertas: Mesa[] = [];
  mesaSelecionada: Mesa | null = null; // Mesa que está selecionada para visualizar e adicionar produtos
  senha = '';
  novoCliente: Cliente = { nome: '', telefone: '' };
  modalFinalizarMesaVisivel = false;
  cupomFiscalModalAberto = false;
  subtotal = 0;
  descontoValor = 0;
  descontoPercent = 0;
  total = 0;
  modalItensConsumidosVisivel = false;
  modalAdicionarProdutoVisivel = false;
  loading!: boolean;
  produtos: Products[] = [];
  pesquisaProduto: string = '';
  produtoSelecionado: Produto | null = null;
  quantidadeProdutoAdicionar: number = 1; // Quantidade padrão ao selecionar um produto
  bandeiraReadonly!: boolean;
  parcelamentoReadonly!: boolean;
  bandeira!: string;
  parcelamento!: number;
  @ViewChild('notaFiscalContentElement', { static: true })
  notaFiscalContentElement!: ElementRef;
  jwtHelper: JwtHelperService = new JwtHelperService();
  level?: string;
  qrcode: string = '';
  products: Products[] = [];
  paytypes: any[] = [];
  bandtypes: any[] = [];
  private modalRef: NgbModalRef | undefined;
  SelectedClienteId!: string;
  listaProdutos: Produto[] = [];
  nome: string = '';
  telefone: string = '';
  vendorName = '';
  ClienteName = '';
  ClienteCPF_CNPJ = '';
  SubTotal: number = 0;
  Total: number = 0;
  DescontoValor: number = 0;
  DescontoPercent: number = 0;
  Parcelamento: number = 0;
  numeroMesa:string = '0';
  CfiscalDataHora: string | undefined;
  formaPagamento: number = 0;
  valorParcela: number = 1;
  ultimoNumeroCF: number = 0;
  proximoNumeroCF: string = '000000000';
  valorPago: number = 0;
  troco: number = 0;
  numerosMesasDisponiveis!: number[];
  novoNumeroMesa!: number;
  hover: boolean = false;
  id_mesa: number = 0
  company?: Company[];
  companyInfo?: Company;
  formComp: FormGroup;
  dadosDaVenda: any;
  totalFinal = 0

  // dadosDaVenda = {
  //   cliente_id: 'Q1', // Cliente Anônimo
  //   vendedor: 'Presencial',
  //   cliente: this.ClienteName,
  //   cpf_cnpj: '', // Deixando em branco
  //   telefone: this.telefone,
  //   forma_pagamento_id: this.formaPagamento,
  //   bandeira_id: this.bandeira,
  //   parcelamento: this.parcelamento,
  //   subtotal: this.SubTotal,
  //   desconto: this.DescontoValor,
  //   valor_total: this.Total,
  //   valor_total_pago: this.valorPago,
  //   troco: (this.valorPago - this.total).toFixed(2),
  //   quantidade_itens: this.listaProdutos.length,
  //   numero_cupom_fiscal: this.proximoNumeroCF,
  //   imposto_estadual: 6, // Insira o valor do imposto estadual, caso possua
  //   imposto_federal: 10, // Insira o valor do imposto federal, caso possua
  //   itens_vendidos: this.listaProdutos.map((produto) => ({
  //     produto: produto.nome,
  //     codigo_produto: produto.codigo,
  //     quantidade: produto.quantidade,
  //     preco_unitario: produto.preco,
  //     subtotal_item: Number((produto.preco * produto.quantidade).toFixed(2)),
  //   })),
  // };


  constructor(private productService: ProductService,
              private userService: UserService,
              private paytypeService: FuncPaymentsService,
              private salesService: SalesService,
              private mesasLocalStorage: MesasLocalstorageService,
              private CompanySettingsService: CompanySettingsService,
              private fb: FormBuilder,) {

    this.formComp = this.fb.group({
      razao_social: [''],
      nome_fantasia: [''],
      cnpj: [''],
      state_registration: [''],
      municipal_registration: [''],
      telephone: [''],
      pix_key: ['']
    });

  }

  ngOnInit(): void {
    this.getProduct();
    this.buscarPaytypes();
    this.buscarBandTypes();
    this.onFormaPagamentoDinheiro();
    this.buscarUltimoNumeroCF();
    this.atualizarNumerosMesasDisponiveis();
    this.mesasAbertas = this.mesasLocalStorage.mesasAbertas;
    // Atualizar o cronômetro a cada segundo
    setInterval(() => {
      this.calcularTempoDecorrido();
    }, 1000);

    // Verifique se alguma mesa está iniciada e reinicie o cronômetro
    this.mesasAbertas.forEach(mesa => {
      if (mesa.iniciado) {
        this.mesasLocalStorage.iniciarCronometro(mesa);
      }
    });
    this.getInfos();


  }

  ngAfterContentChecked(): void {
    // Atualizações nas variáveis vinculadas
    this.calcularTroco();
    // Outras atualizações, se houver
  }

  abrirNovaMesa(): void {
    const numerosMesasAbertas = this.mesasAbertas.map((mesa) => mesa.numero);
    const numerosTodasMesas = Array.from({ length: 30 }, (_, i) => i + 1);
    this.numerosMesasDisponiveis = numerosTodasMesas.filter(
      (numero) => !numerosMesasAbertas.includes(numero)
    );
    this.atualizarNumerosMesasDisponiveis();

    // Exibir o modal para abrir uma nova mesa
    this.modalNovaMesaVisivel = true;
  }

  fecharModalNovaMesa(): void {
    // Fechar o modal para abrir uma nova mesa
    this.modalNovaMesaVisivel = false;
    this.novoCliente = { nome: '', telefone: '' };
    this.alertMesa = false;
    this.alertDesconto = '';
  }


  criarNovaMesa(): any {
    if (!this.novoNumeroMesa || this.novoNumeroMesa <= 0) {
      this.alertMesa = true;
      return 'Selecione um número de mesa válido.';
    }
    this.alertMesa = false;
    if (this.mesasAbertas.some((mesa) => mesa.numero === this.novoNumeroMesa)) {
      this.alertMesa = true;
      return 'Essa mesa já está aberta.';
    }

    const novaMesa: Mesa = {
      id: this.id_mesa++, // Certifique-se de atualizar o ID adequadamente
      numero: this.novoNumeroMesa,
      nome: this.novoCliente.nome,
      telefoneResponsavel: this.novoCliente.telefone,
      produtosConsumidos: [],
      totalAPagar: 0,
      abertura: new Date(),
      tempoAberta: new Date(),
      iniciado: true,
      tempoInicial: 0,
      tempoTotal: 0,
    };
    this.mesasAbertas.push(novaMesa);

    const index = this.numerosMesasDisponiveis.indexOf(this.novoNumeroMesa);
    if (index !== -1) {
      this.numerosMesasDisponiveis.splice(index, 1);
    }

    this.fecharModalNovaMesa();

    // Salvar as mesas no armazenamento local
    this.mesasLocalStorage.salvarMesasNoLocalStorage(this.mesasAbertas);
  }

  isMesaAberta(numeroMesa: number): boolean {
    return this.mesasAbertas.some((mesa) => mesa.numero === numeroMesa);
  }


  finalizarMesaSelecionada(mesa: Mesa, abrirModal: boolean): void {
    this.mesaSelecionada = mesa;
    this.calcularSubtotal(mesa);
    this.calcularTotalAPagar(mesa);
    this.aplicarDesconto();

    if (abrirModal) {
      this.abrirModalFinalizarMesa();
    }
  }

  calcularTotalAPagar(mesa: Mesa): void {
    const subtotal = this.calcularSubtotal(mesa);

    if (this.descontoValor > 0) {
      mesa.totalAPagar = subtotal - this.descontoValor;
    } else if (this.descontoPercent > 0) {
      const descontoValor = (this.descontoPercent / 100) * subtotal;
      mesa.totalAPagar = subtotal - descontoValor;
    } else {
      mesa.totalAPagar = subtotal;
    }
  }

  calcularTotal(): number {
    let total = 0;

    this.mesasAbertas.forEach((mesa) => {
      total += mesa.totalAPagar;
    });

    total -= this.descontoValor; // Subtrair o valor do desconto em R$ do total final

    return Number(total);
  }

  verificarSenha_valor(): void {
    // Realize a verificação da senha aqui, usando a API ou lógica necessária
    // Por exemplo, chame this.userService.getUserLevelByPass(this.senha) para verificar a senha

    this.userService.getUserLevelByPass(this.senha).subscribe(
      (user) => {
        // Verifique o nível de usuário aqui
        if (user.level >= 6) {
          const descontoPercentElement = document.getElementById(
            'descontoValor'
          ) as HTMLInputElement;
          if (descontoPercentElement) {
            descontoPercentElement.readOnly = false;
          }
        } else {
          // Faça algo se a senha estiver incorreta ou o nível do usuário for menor que 6
          // alert('Você não pode adicionar um desconto.');
          this.alertMesa = true;
          this.alertDesconto = 'Você não pode adicionar um desconto.';

          setTimeout(() => {
            this.alertMesa = false;
          },3000);
        }

        // Fecha o modal após verificar a senha
        this.fecharModalSenha();
      },
      (error) => {
        // Trate erros aqui, como senha incorreta ou erro de conexão
        this.alertMesa = true;
        this.alertDesconto =
          'Erro ao verificar a senha. Por favor, tente novamente.';

          setTimeout(() => {
            this.alertMesa = false;
          },3000);
        // alert('Erro ao verificar a senha. Por favor, tente novamente.');
        // Fecha o modal após verificar a senha, mesmo em caso de erro
        // this.fecharModalSenha();
      }
    );
  }

  verificarSenha_percent() {
    // Realize a verificação da senha aqui, usando a API ou lógica necessária
    // Por exemplo, chame this.userService.getUserLevelByPass(this.senha) para verificar a senha

    this.userService.getUserLevelByPass(this.senha).subscribe(
      (user) => {
        // Verifique o nível de usuário aqui
        if (user.level >= 6) {
          // Faça algo se a senha estiver correta e o nível do usuário for maior ou igual a 6
          // Por exemplo, desbloquear o campo de desconto:
          const descontoPercentElement = document.getElementById(
            'descontoPercent'
          ) as HTMLInputElement;
          if (descontoPercentElement) {
            descontoPercentElement.readOnly = false;
          }
        } else {
          // Faça algo se a senha estiver incorreta ou o nível do usuário for menor que 6
          // alert('Você não pode adicionar um desconto.');

          this.alertMesa = true;
          this.alertDesconto = 'Você não pode adicionar um desconto.';

          setTimeout(() => {
            this.alertMesa = false;
          },3000);

          this.fecharModalSenha();
        }

        // Fecha o modal após verificar a senha
        // this.fecharModalSenha();
      },
      (error) => {
        // Trate erros aqui, como senha incorreta ou erro de conexão
        // alert('Erro ao verificar a senha. Por favor, tente novamente.');

        this.alertMesa = true;
        this.alertDesconto =
          'Erro ao verificar a senha. Por favor, tente novamente.';

          setTimeout(() => {
            this.alertMesa = false;
          },3000);

        // Fecha o modal após verificar a senha, mesmo em caso de erro
        // this.fecharModalSenha();
      }
    );

    this.alertMesa = false;
  }

  fecharModalSenha(): void {
    // Lógica para fechar o modal de senha (ao cancelar ou confirmar senha)
    this.modalSenhaVisivel_val = false;
    this.modalSenhaVisivel_perc = false;
    this.senha = '';
  }

  abrirModalSenhaValor(): void {
    // Lógica para abrir o modal de senha para adicionar valor de desconto
    this.modalSenhaVisivel_val = true;
  }

  abrirModalSenhaPercent(): void {
    this.modalSenhaVisivel_perc = true;
  }

  fecharModalSenhaPercent(): void {
    // Lógica para fechar o modal de senha para desconto em percentual (ao cancelar ou confirmar)
    // Implemente essa lógica de acordo com o seu modal de senha para percentual
  }

  adicionarProdutoConsumido(): void {
    if (
      this.mesaSelecionada &&
      this.produtoSelecionado &&
      this.quantidadeProdutoAdicionar > 0
    ) {
      // Verifica se o produto já existe na lista de produtos consumidos da mesa
      const produtoExistente = this.mesaSelecionada.produtosConsumidos.find(
        (produto) => produto.codigo === this.produtoSelecionado?.codigo
      );

      if (produtoExistente) {
        // Atualiza a quantidade do produto existente
        produtoExistente.quantidade += this.quantidadeProdutoAdicionar;
      } else {
        // Cria um novo produto consumido
        const produtoParaAdicionar: ProdutoConsumido = {
          codigo: this.produtoSelecionado.codigo,
          nome: this.produtoSelecionado.nome,
          quantidade: this.quantidadeProdutoAdicionar,
          preco: this.produtoSelecionado.preco,
        };
        this.mesaSelecionada.produtosConsumidos.push(produtoParaAdicionar);
        this.atualizarLocalStorage();
      }

      // Calcula o total a pagar e realiza outras ações necessárias
      this.calcularTotalAPagar(this.mesaSelecionada);
      this.quantidadeProdutoAdicionar = 1;
      this.produtoSelecionado = null;

      // Fecha o modal
      this.fecharModalAdicionarProduto();

      console.log('Produto adicionado/atualizado com sucesso à mesa selecionada!');
    }
  }



  removerProdutoConsumido(index: number): void {
    // Lógica para remover um produto consumido da mesa selecionada pelo índice
    if (this.mesaSelecionada) {
      this.mesaSelecionada.produtosConsumidos.splice(index, 1);
      this.calcularTotalAPagar(this.mesaSelecionada);
    }
  }

  fecharModalFinalizarMesa(): void {
    this.modalFinalizarMesaVisivel = false;
    this.cupomFiscalModalAberto = false;
    this.subtotal = 0;
    this.descontoValor = 0;
    this.descontoPercent = 0;
    this.total = 0;
  }

  calcularSubtotal(mesa: Mesa): number {
    let subtotal = 0;

    mesa.produtosConsumidos.forEach((produto) => {
      subtotal += produto.preco * produto.quantidade;
    });

    return subtotal;
  }

  aplicarDesconto(): void {
    if (this.mesaSelecionada) {
      this.calcularTotalAPagar(this.mesaSelecionada);
      this.total = this.mesaSelecionada.totalAPagar;
    }
  }

  finalizarMesa(): void {
    if (this.mesaSelecionada) {
      // Implemente a lógica para finalizar a mesa aqui, como adicionar os produtos consumidos
      // ao backend ou realizar outras ações necessárias.
      this.mesaSelecionada = null; // Limpar a seleção da mesa para que o card não mostre o modal de produtos
    }
  }

  atualizarDescontoValor(): void {
    const subtotal = this.calcularSubtotal(this.mesaSelecionada!); // Certifique-se de que a mesa selecionada não é nula

    if (subtotal === 0) {
      this.descontoPercent = 0;
    } else {
      this.descontoPercent = +((this.descontoValor / subtotal) * 100);
      this.descontoPercent = Math.min(this.descontoPercent, 100); // Garante que o desconto em % não ultrapasse 100%
    }

    this.aplicarDesconto(); // Adicione esta linha para atualizar o valor total
  }

  atualizarDescontoPercent(): void {
    const total = this.mesaSelecionada?.totalAPagar || 0; // Certifique-se de que a mesa selecionada não é nula

    this.descontoValor = +(total * (this.descontoPercent / 100));
    this.descontoValor = Math.min(this.descontoValor, total); // Garante que o desconto em R$ não ultrapasse o total

    this.aplicarDesconto(); // Adicione esta linha para atualizar o valor total
  }

  abrirModalFinalizarMesa(): void {
    this.modalFinalizarMesaVisivel = true;
    this.cupomFiscalModalAberto = true;

    this.gerarCupomFiscal();
  }

  fecharModalProdutosConsumidos(): void {
    this.modalItensConsumidosVisivel = false;
    this.mesaSelecionada = null;
  }

  abrirModalProdutosConsumidos(mesa: Mesa): void {
    this.atualizarTempoAberturaMesa();
    this.mesaSelecionada = mesa;
    this.modalItensConsumidosVisivel = true;
  }

  abrirModalAdicionarProduto(mesa: Mesa): void {
    this.modalItensConsumidosVisivel = false;
    this.mesaSelecionada = mesa;
    this.modalAdicionarProdutoVisivel = true;
  }

  fecharModalAdicionarProduto(): void {
    this.modalAdicionarProdutoVisivel = false;
    this.mesaSelecionada = null;
  }

  getProduct() {
    this.loading = true;
    // Recupera todos os pagamentos do servidor
    this.productService
      .getAllProducts()
      .pipe(map((response: any) => response.items as Products[]))
      .subscribe(
        // Quando a resposta for bem-sucedida
        (produtos: Products[]) => {
          // Define os pagamentos recuperados na propriedade da classe
          this.produtos = produtos.map((produto: Products) => ({
            ...produto,
            preco: Number(produto.preco_venda), // Converte o preço para número
          }));
          this.loading = false;
        },
        // Quando ocorrer um erro na resposta
        (error) => {
          console.log('Houve um erro ao requisitar os produtos.');
        }
      );
  }

  perguntarQuantidade(produto: Produto): void {
    this.produtoSelecionado = produto;
    this.quantidadeProdutoAdicionar = 1; // Define a quantidade padrão para 1 após selecionar o produto
  }

  onFormaPagamentoDinheiro() {
    const formaPagamento = (
      document.getElementById('formaPagamento') as HTMLSelectElement
    ).value;

    if (formaPagamento === '1') {
      // 1 representa a forma de pagamento "Dinheiro"
      this.bandeiraReadonly = true;
      this.parcelamentoReadonly = true;
      this.bandeira = '6'; // "6" representa "À vista"
      this.parcelamento = 1;
    } else {
      this.bandeiraReadonly = false;
      this.parcelamentoReadonly = false;
      this.bandeira = 'select';
    }
  }

  buscarPaytypes() {
    this.paytypeService.getAllPayTypes().subscribe(
      (paytypes: Paytype[]) => {
        this.paytypes = paytypes.map((paytype: Paytype) => ({
          id: paytype.forma_pagamento_id,
          nome: paytype.descricao,
        }));
        this.loading = false;
      },
      (error) => {
        console.log('Ocorreu um erro ao solicitar os tipos de pagamento.');
      }
    );
  }

  checkValorPago(): void {
    let formaPagamento = (
      document.getElementById('formaPagamento') as HTMLSelectElement
    ).value;
    if (formaPagamento === 'Dinheiro') {
      if (this.valorPago === null || isNaN(this.valorPago)) {
        this.valorPago = 0;
      }
    }
  }

  calcularTroco(): number {
    this.Total = parseFloat(
      (document.getElementById('total') as HTMLSelectElement).value.replace(
        /[^0-9.-]/g,
        ''
      )
    );
    if (this.valorPago >= this.Total) {
      this.troco = this.valorPago - this.Total;
    } else {
      this.troco = 0; // Caso o valor pago seja menor que o total da compra, o troco será zero
    }
    return this.troco;
  }

  validarCamposVenda() {
    let formaPagamento = (document.getElementById('formaPagamento') as HTMLSelectElement).value;
    let bandeira = (document.getElementById('bandeira') as HTMLSelectElement).value;

    // Lista de campos obrigatórios que precisam estar preenchidos
    let camposObrigatorios = [];
    if (this.listaProdutos.length === 0) camposObrigatorios.push('Pelo menos um produto na lista');
    if (formaPagamento === '' || formaPagamento === 'select') camposObrigatorios.push('Forma de pagamento');
    if (bandeira === '' || bandeira === 'select') camposObrigatorios.push('Bandeira do cartão');

    // Verificar se todos os campos obrigatórios estão preenchidos
    if (camposObrigatorios.length === 0) {
      // Verificar o valor pago se a forma de pagamento for "Dinheiro"
      if (formaPagamento === '1') {
        let valorPagoElement = document.getElementById('valorPago') as HTMLInputElement;
        let valorPago = valorPagoElement ? parseFloat(valorPagoElement.value) : NaN;

        if (isNaN(valorPago) || valorPago <= 0) {
          // O campo "Valor Pago" não foi preenchido corretamente, exibir alerta de erro
          alert('Por favor, informe um valor válido maior que zero no campo "Valor Pago" antes de finalizar a venda.');
          return; // Retorna sem finalizar a venda
        }
        this.valorPago = valorPago;
      } else {
        this.valorPago = this.total;
      }

      // Preencher os dados da venda antes de finalizar
      this.dadosDaVenda = {
        cliente_id: 'Q1', // Cliente Anônimo
        vendedor: 'Presencial',
        cliente: this.ClienteName,
        cpf_cnpj: '', // Deixando em branco, pois você mencionou que não tem esse dado
        telefone: this.telefone,
        forma_pagamento_id: (document.getElementById('formaPagamento') as HTMLSelectElement).value,
        bandeira_id: (document.getElementById('bandeira') as HTMLSelectElement).value,
        parcelamento: this.parcelamento,
        subtotal: this.subtotal,
        desconto: this.DescontoValor,
        valor_total: this.Total,
        valor_total_pago: this.valorPago,
        troco: (this.valorPago - this.total).toFixed(2),
        quantidade_itens: this.listaProdutos.length,
        numero_cupom_fiscal: this.proximoNumeroCF,
        imposto_estadual: 6, // Insira o valor do imposto estadual, caso possua
        imposto_federal: 10, // Insira o valor do imposto federal, caso possua
        itens_vendidos: this.listaProdutos.map((produto) => ({
          produto: produto.nome,
          codigo_produto: produto.codigo,
          quantidade: produto.quantidade,
          preco_unitario: produto.preco,
          subtotal_item: Number((produto.preco * produto.quantidade).toFixed(2)),
        })),
      };

      // Se chegou até aqui, todos os campos estão preenchidos corretamente
      // Exibir alerta de confirmação
      if (confirm('Deseja finalizar a venda?')) {
        // Após finalizar a venda com sucesso, remover a mesa selecionada da lista de mesas abertas
        if (this.mesaSelecionada) {
          this.removerMesaFinalizada(this.mesaSelecionada);
        }
        this.modalFinalizarMesaVisivel = false;
        this.finalizarVenda();
        this.gerarCupomFiscal();

      } else {
        // Alguns campos não estão preenchidos, exibir alerta de erro com os campos obrigatórios faltantes
        let mensagemErro = 'Por favor, preencha os seguintes campos antes de finalizar a venda:\n\n';
        mensagemErro += camposObrigatorios.join('\n');
        alert(mensagemErro);
      }
    }
  }

  // validarCamposVenda() {
    // if (this.mesaSelecionada) {
    //   this.removerMesaFinalizada(this.mesaSelecionada);
    // }
    // this.modalFinalizarMesaVisivel = false;
    // let formaPagamento = (document.getElementById('formaPagamento') as HTMLSelectElement).value;
    // let bandeira = (document.getElementById('bandeira') as HTMLSelectElement).value;
    // let vendorID = (document.getElementById('inputVendedorID') as HTMLSelectElement).value;
    // let vendorName = (document.getElementById('inputVendedor') as HTMLSelectElement).value;
    // let ClienteName = (document.getElementById('inputCliente') as HTMLSelectElement).value;
    // let ClienteCPF_CNPJ = (document.getElementById('inputCpf') as HTMLSelectElement).value;
    // let ClienteTelephone = (document.getElementById('inputTelefone') as HTMLSelectElement).value;
    // let SubTotal = parseFloat((document.getElementById('subtotal') as HTMLSelectElement).value.replace(/[^0-9.-]/g, ''));
    // let Total = parseFloat((document.getElementById('total') as HTMLSelectElement).value.replace(/[^0-9.-]/g, ''));
    // let DescontoValor = (document.getElementById('descontoValor') as HTMLSelectElement).value;
    // let DescontoPercent = (document.getElementById('descontoPercent') as HTMLSelectElement).value;
    // let clienteID = (document.getElementById('inputClienteID') as HTMLSelectElement).value;
    //
    // console.log(formaPagamento);
    //
    // // Lista de campos obrigatórios que precisam estar preenchidos
    // let camposObrigatorios = [];
    // if (this.listaProdutos.length === 0) camposObrigatorios.push('Pelo menos um produto na lista');
    // if (formaPagamento === '' || formaPagamento === 'select') camposObrigatorios.push('Forma de pagamento');
    // if (bandeira === '' || bandeira === 'select') camposObrigatorios.push('Bandeira do cartão');
    //
    // // Verificar se todos os campos obrigatórios estão preenchidos
    // if (camposObrigatorios.length === 0) {
    //   // Verificar o valor pago se a forma de pagamento for "Dinheiro"
    //   if (formaPagamento === '1') {
    //     let valorPagoElement = document.getElementById('valorPago') as HTMLInputElement;
    //     let valorPago = valorPagoElement ? parseFloat(valorPagoElement.value) : NaN;
    //
    //     if (isNaN(valorPago) || valorPago <= 0) {
    //       // O campo "Valor Pago" não foi preenchido corretamente, exibir alerta de erro
    //       alert('Por favor, informe um valor válido maior que zero no campo "Valor Pago" antes de finalizar a venda.');
    //       return; // Retorna sem finalizar a venda
    //     }
    //     this.valorPago = valorPago;
    //   } else {
    //     this.valorPago = this.total;
    //   }
    //
    //   // Preencher os dados da venda antes de finalizar
    //   // this.dadosDaVenda = {
    //   //   cliente_id: clienteID,
    //   //   vendedor: vendorName,
    //   //   cliente: ClienteName,
    //   //   cpf_cnpj: ClienteCPF_CNPJ,
    //   //   telefone: ClienteTelephone,
    //   //   forma_pagamento_id: formaPagamento,
    //   //   bandeira_id: bandeira,
    //   //   parcelamento: this.parcelamento,
    //   //   subtotal: Number(SubTotal),
    //   //   desconto: Number(DescontoValor),
    //   //   valor_total: Number(Total),
    //   //   valor_total_pago: this.valorPago,
    //   //   troco: (this.valorPago - this.total).toFixed(2),
    //   //   quantidade_itens: this.listaProdutos.length,
    //   //   numero_cupom_fiscal: this.proximoNumeroCF,
    //   //   imposto_estadual: 6, // Insira o valor do imposto estadual, caso possua
    //   //   imposto_federal: 10, // Insira o valor do imposto federal, caso possua
    //   //   itens_vendidos: this.listaProdutos.map(produto => ({
    //   //     produto: produto.nome.toString(),
    //   //     codigo_produto: produto.codigo,
    //   //     quantidade: produto.quantidade,
    //   //     preco_unitario: produto.preco,
    //   //     subtotal_item: Number((produto.preco * produto.quantidade).toFixed(2))
    //   //   })),
    //   // };
    //
    //   // Se chegou até aqui, todos os campos estão preenchidos corretamente
    //   // Exibir alerta de confirmação
    //   if (confirm('Deseja finalizar a venda?')) {
    //     // Após finalizar a venda com sucesso, remover a mesa selecionada da lista de mesas abertas
    //     if (this.mesaSelecionada) {
    //       this.removerMesaFinalizada(this.mesaSelecionada);
    //     }
    //     this.modalFinalizarMesaVisivel = false;
    //     // console.log(this.dadosDaVenda);
    //     // this.finalizarVenda();
    //     // this.gerarCupomFiscal();
    //   }
    // } else {
    //   // Alguns campos não estão preenchidos, exibir alerta de erro com os campos obrigatórios faltantes
    //   let mensagemErro = 'Por favor, preencha os seguintes campos antes de finalizar a venda:\n\n';
    //   mensagemErro += camposObrigatorios.join('\n');
    //   alert(mensagemErro);
    // }
  // }

  buscarUltimoNumeroCF() {
    this.salesService.getCFN().subscribe(
      (response: any) => {
        // Verifica se a resposta possui a propriedade "rows" e se o array "rows" não está vazio
        if (response && response.rows && response.rows.length > 0) {
          // Obtém o primeiro número do cupom fiscal do array "rows"
          this.ultimoNumeroCF = response.rows[0].numero_cupom_fiscal;
        } else {
          console.log('Não foi possível obter o número do cupom fiscal.');
        }
      },
      (error) => {
        console.log('Ocorreu um erro ao solicitar os tipos de pagamento.');
      }
    );
  }

  gerarCupomFiscal() {
    const mesasAbertasStr = localStorage.getItem('mesasAbertas'); // Recupera os dados do localStorage
    if (mesasAbertasStr) {
      const mesasAbertas = JSON.parse(mesasAbertasStr);
      const mesaSelecionada = mesasAbertas.find((mesa: { numero: number | undefined; }) => mesa.numero === this.mesaSelecionada?.numero);

      if (mesaSelecionada) {
        // Acesse todos os campos da mesaSelecionada
        const {
          id,
          numero,
          nome,
          telefoneResponsavel,
          produtosConsumidos,
          totalAPagar,
          abertura,
          tempoAberta,
          iniciado,
          tempoInicial
        } = mesaSelecionada;

        const momentoFechamento = new Date().getTime();

        const tempoInicialMesa = tempoInicial;

        const diferencaMilissegundos = momentoFechamento - tempoInicialMesa;

        const tempoTotalSegundos = Math.floor(diferencaMilissegundos / 1000);

        const dadosDaVenda = {
          numero_mesa: numero,
          nome_mesa: nome,
          telefone_responsavel: telefoneResponsavel,
          forma_pagamento_id: (document.getElementById('formaPagamento') as HTMLSelectElement).value,
          abertura: abertura,
          tempo_aberta: tempoAberta,
          iniciado: iniciado,
          tempo_inicial: tempoInicial,
          tempoTotal: tempoTotalSegundos,
          bandeira_id: this.bandeira,
          parcelamento: this.parcelamento,
          subtotal: this.Total,
          desconto: this.DescontoValor,
          valor_total: this.Total,
          valor_total_pago: this.valorPago,
          troco: (this.valorPago - this.total).toFixed(2),
          quantidade_itens: produtosConsumidos.length,
          numero_cupom_fiscal: this.proximoNumeroCF,
          imposto_estadual: 6, // Insira o valor do imposto estadual, se aplicável
          imposto_federal: 10, // Insira o valor do imposto federal, se aplicável
          itens_vendidos: produtosConsumidos.map((produto: any) => ({
            produto: produto.nome,
            codigo_produto: produto.codigo,
            quantidade: produto.quantidade,
            preco_unitario: produto.preco,
            subtotal_item: Number((produto.preco * produto.quantidade).toFixed(2)),
          })),
        };

        this.dadosDaVenda = dadosDaVenda;
      } else {
        console.error('A mesa selecionada não foi encontrada nas mesas abertas.');
      }
    } else {
      console.error('Os dados das mesas abertas não foram encontrados.');
    }
  }


  finalizarVenda(): void {
    this.gerarCupomFiscal();

    if (this.mesaSelecionada) {
      // Chama o serviço para adicionar a venda (substitua 'this.salesService.addMesasVenda' conforme necessário)
      this.salesService.addMesasVenda(this.dadosDaVenda).subscribe(
        (res) => {
          console.log('Venda finalizada com sucesso:', res);

          // Usar a assertiva de tipo para garantir que TypeScript saiba que this.mesaSelecionada não é nulo
          this.removerMesaFinalizada(this.mesaSelecionada!);

          // Feche o modal de finalização da mesa
          this.fecharModalFinalizarMesa();
        },
        (err) => {
          console.error('Erro ao finalizar venda:', err);
        }
      );
    } else {
      console.error('Mesa não selecionada. Não é possível finalizar a venda.');
    }
  }





  // gerarCupomFiscal() {
  //   this.formaPagamento = (
  //     document.getElementById('formaPagamento') as HTMLSelectElement
  //   ).value;
  //   let dataAtual = new Date();
  //   dataAtual.setUTCHours(dataAtual.getUTCHours() - 3);
  //
  //   // Formatar a data e hora no formato (DD/MM/AAAA - HH:mm:ss)
  //   this.CfiscalDataHora = `${dataAtual
  //     .getUTCDate()
  //     .toString()
  //     .padStart(2, '0')}/${(dataAtual.getUTCMonth() + 1)
  //     .toString()
  //     .padStart(2, '0')}/${dataAtual.getUTCFullYear()} - ${dataAtual
  //     .getUTCHours()
  //     .toString()
  //     .padStart(2, '0')}:${dataAtual
  //     .getUTCMinutes()
  //     .toString()
  //     .padStart(2, '0')}:${dataAtual
  //     .getUTCSeconds()
  //     .toString()
  //     .padStart(2, '0')}`;
  //
  //   // Atualizar os valores das variáveis
  //   this.Total = parseFloat(
  //     (document.getElementById('total') as HTMLSelectElement).value.replace(
  //       /[^0-9.-]/g,
  //       ''
  //     )
  //   );
  //   this.DescontoValor = parseFloat(
  //     (
  //       document.getElementById('descontoValor') as HTMLSelectElement
  //     ).value.replace(/[^0-9.-]/g, '')
  //   );
  //   this.DescontoPercent = parseFloat(
  //     (
  //       document.getElementById('descontoPercent') as HTMLSelectElement
  //     ).value.replace(/[^0-9.-]/g, '')
  //   );
  //   this.Parcelamento = parseInt(
  //     (document.getElementById('parcelamento') as HTMLSelectElement).value,
  //     10
  //   );
  //   this.numeroMesa = (
  //     document.getElementById('numeroMesa') as HTMLSelectElement
  //   ).value;
  //
  //   this.ClienteName = (
  //     document.getElementById('nomeCliente') as HTMLSelectElement
  //   ).value;
  //   this.telefone = (
  //     document.getElementById('telefoneCliente') as HTMLSelectElement
  //   ).value;
  //   this.SubTotal = parseFloat(
  //     (document.getElementById('subtotal') as HTMLSelectElement).value.replace(
  //       /[^0-9.-]/g,
  //       ''
  //     )
  //   );
  //
  //   let bandeiraElement = document.getElementById(
  //     'bandeira'
  //   ) as HTMLSelectElement;
  //   this.bandeira = (
  //     document.getElementById('bandeira') as HTMLSelectElement
  //   ).selectedOptions[0].text;
  //
  //   // Verificar se a forma de pagamento é parcelada
  //   if (this.parcelamento !== 0) {
  //     let parcelamento = this.Parcelamento;
  //     let total = this.calcularTotal();
  //     // Define o valor por parcela
  //     this.valorParcela = total / parcelamento;
  //   }
  //
  //   // Verificar se o desconto é zero e calcular com base no Subtotal e no Total
  //   if (this.DescontoPercent === 0) {
  //     let subtotal = this.calcularSubtotal(this.mesaSelecionada!);
  //     let total = this.calcularTotal();
  //     let descontoValor = subtotal - total;
  //
  //     // Define o valor do desconto em R$ e em percentual
  //     this.DescontoValor = descontoValor;
  //     this.DescontoPercent = (descontoValor / subtotal) * 100;
  //   }
  //
  //   // Show the modal
  //   // this.abrirCupomFiscalModal();
  // }

  buscarBandTypes() {
    this.paytypeService.getAllBandsTypes().subscribe(
      (bandtypes: Bandeiras[]) => {
        this.bandtypes = bandtypes.map((bandtype: Bandeiras) => ({
          id: bandtype.bandeira_id,
          nome: bandtype.descricao,
        }));
        this.loading = false;
      },
      (error) => {
        console.log('Ocorreu um erro ao solicitar os tipos de bandeiras.');
      }
    );
  }

  fecharCupomFiscalModal() {
    this.cupomFiscalModalAberto = false;
  }

  removerMesaFinalizada(mesa: Mesa): void {
    // Verifique se a mesa está na lista de mesas abertas
    const index = this.mesasAbertas.findIndex(m => m.id === mesa.id);

    if (index !== -1) {
      // Remova a mesa da lista de mesas abertas
      this.mesasAbertas.splice(index, 1);

      // Atualize o localStorage para refletir a nova lista de mesas abertas
      localStorage.setItem('mesasAbertas', JSON.stringify(this.mesasAbertas));
    }
  }


  formatarTelefone(telefone: string): string {
    // Remove todos os caracteres não numéricos
    const numeros = telefone.replace(/\D/g, '');

    // Formatação do telefone (XX) XXXXX-XXXX
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  atualizarNumerosMesasDisponiveis() {
    // Limpar a lista antes de atualizar
    this.numerosMesasDisponiveis = [];

    // Preencher a lista de números de mesa disponíveis
    const numeroMaximoMesas = 30;
    for (let i = 1; i <= numeroMaximoMesas; i++) {
      if (!this.isMesaAberta(i)) {
        this.numerosMesasDisponiveis.push(i);
      }
    }
  }

  // Função para calcular o tempo decorrido desde a abertura da mesa
  calcularTempoDecorrido(): void {
    const agora = new Date();
    for (const mesa of this.mesasAbertas) {
      const tempoDecorrido = agora.getTime() - mesa.abertura.getTime();
      mesa.tempoAberta = new Date(tempoDecorrido);
    }
  }


  atualizarTempoAberturaMesa(): void {
    const agora = new Date();
    for (const mesa of this.mesasAbertas) {
      const tempoDecorrido = agora.getTime() - mesa.abertura.getTime();
      mesa.tempoAberta = new Date(tempoDecorrido);
    }
  }


  getInfos() {
    this.CompanySettingsService.getAllInfos()
      .pipe(
        map((response: any) => response.items as Company[])
      )
      .subscribe(
        (company: Company[]) => {
          this.company = company;
          this.companyInfo = company[0];
        },
        // ... lidar com erro ...
      );
  }

  formatCNPJ(cnpj: string): string {
    // Removendo caracteres não numéricos
    const numericCNPJ = cnpj.replace(/\D/g, '');

    // Aplicando a formatação: 12345678901234 -> 12.345.678/9012-34
    return `${numericCNPJ.slice(0, 2)}.${numericCNPJ.slice(2, 5)}.${numericCNPJ.slice(5, 8)}/${numericCNPJ.slice(8, 12)}-${numericCNPJ.slice(12)}`;
  }

  formatTelefone(telefone: string): string {
    // Removendo caracteres não numéricos
    const numericTelefone = telefone.replace(/\D/g, '');

    // Aplicando a formatação: 2732446491 -> (27) 3244-6491
    return `(${numericTelefone.slice(0, 2)}) ${numericTelefone.slice(2, 6)}-${numericTelefone.slice(6)}`;
  }


  deleteSavedTables() {
    const confirmDelete = window.confirm('Tem certeza de que deseja limpar todas as mesas abertas?');

    if (confirmDelete) {
      localStorage.removeItem('mesasAbertas');
      this.mesasAbertas = []; // Limpa o array mesasAbertas

      // Salva a lista vazia no localStorage
      this.mesasLocalStorage.mesasAbertas = this.mesasAbertas;
      // ou
      localStorage.setItem('mesasAbertas', JSON.stringify(this.mesasAbertas));
    }
  }

  atualizarLocalStorage(): void {
    // Verifica se a mesaSelecionada está definida
    if (this.mesaSelecionada) {
      // Obtém todas as mesas do localStorage (supondo que você já tenha as informações no localStorage)
      const mesasAbertas: Mesa[] = JSON.parse(localStorage.getItem('mesasAbertas') || '[]');

      // Encontra a mesa correspondente e atualiza-a
      const mesaIndex = mesasAbertas.findIndex((mesa) => mesa.numero === this.mesaSelecionada?.numero);
      if (mesaIndex !== -1) {
        // Atualiza a mesa no array de mesas
        mesasAbertas[mesaIndex] = this.mesaSelecionada;
        // Atualiza o localStorage com as mesas atualizadas
        localStorage.setItem('mesasAbertas', JSON.stringify(mesasAbertas));
      }
    }
  }

  formatarTotal(): string {
    return this.total.toFixed(2);
  }

}
