# "Operação Fubá Cake": compilando o Copacabana do zero

Esse documento contém instruções para que você possa, por conta própria,
compilar a distribuição Copacabana Linux®, podendo desde obter aprendizado até
mesmo contribuir ao projeto diretamente com correções de *bugs* (falhas) ou
portando para alguma outra arquitetura.  
O processo é bem descrito em várias etapas, para que você não se perca no
caminho, assim como é bem explicado --- ou seja, você não vai apenas copiar e
colar instruções, mas sim entendê-las sem muito esforço.  

## Untando as formas: formatando e montando os discos

Após montar a partição root (``/``) da imagem de disco com o L.E.``mount``,
crie pontos de montagem para o ``/boot``, ``/usr``, ``/opt`` e ``/var``, que
serão utilizados na compilação, e então monte essas partições com o comando
``mount``(8) padrão.

```console
lemount -D /dev/loop0p5 -t dsk
```

```sh
mount /dev/loop0p1 $COPA/boot
mount /dev/loop0p6 $COPA/usr
mount /dev/loop0p7 $COPA/var
mount /dev/loop0p8 $COPA/opt
```

Se você desejar, pode pôr isso dentro de um arquivo e executar com
o Bourne shell, a fim de matar tempo.

## Os ingredientes

Essa seção contém uma lista de dependências necessárias para montar a toolchain
intermediária e o sistema-final, tanto aquelas que devem estar presentes na
máquina-hospedeira quanto instruções para baixar o código-fonte necessário. 

### Pacotes que devem estar instalados na máquina hospedeira

* Um shell compatível com os padrões POSIX atuais, preferivelmente acompanhado do
Korn Shell (KSH-93) ou do GNU Bourne-Again Shell;
* Ferramentas padrões do UNIX, preferivelmente as uutils, lobase ou as GNU
coreutils, que seguem os padrões mais atuais e que muitos *scripts* irão
requisitar;
* Mitzune, para o estágio de chroot;
* L.E.``mount``, opcionalmente para montar discos;
* ``cmp``(1), ``diff``(1), ``diff3``(1), ``sdiff``(1) e o ``patch``(1);
* GNU m4 e as GNU auto\*tools;
* GNU Make;
* GNU sed, partindo da versão 4.1.5;
* New AWK/BWK AWK, ou o GNU AWK;
* util-linux;
* Ferramentas de arquivamento: ``tar``(1) e ``cpio``(1); 
* As principais ferramentas de compressão e decompressão: bzip2, gzip e xz.

### Desempacotando a toolchain inicial

A toolchain inicial contém apenas as ferramentas necessárias para que possamos
montar a toolchain intermediária que servirá, então, para montar o
sistema-base. Elas são a biblioteca C musl, o compilador cruzado e linkeditado
estaticamente, o pacote GNU Binutils, que inclui o linkeditor, e o comando
File, que é usado pelo GNU auto\*conf.  

Primeiramente, faça a transferência da *tarball* para o seu disco rígido.  
O projeto Pindorama provê, em situações normais, duas maneiras de se fazer a
transferência: por meio do servidor oficial e por meio do GitHub.  
Após fazer a transferência, copie a *tarball* para o disco do Copacabana e então
extraia, como de costume.

```console
[baggio@S145 ~]$ cp cross-tools_2022-01-22_16-11-02.tar.xz $COPA
[baggio@S145 ~]$ cd $COPA
[baggio@S145 0v]$ xz -cd cross-tools_2022-01-22_16-11-02.tar.xz | tar -xvf - -C .
x cross-tools/ directory
x cross-tools/include/ directory
x cross-tools/include/monetary.h 395 bytes, 1 tape blocks
# [...]
```

Você deverá ter agora um diretório ``/cross-tools`` presente no disco do
Copacabana.

```console
[baggio@S145 0v]$ pwd
/dsk/0v
[baggio@S145 0v]$ ls -la ./cross-tools/
total 40K
drwxr-xr-x  10 baggio      4K Jan 22 01:35 .
drwxr-xr-x  19 root        4K Jul 10 23:43 ..
drwxrwxr-x   2 baggio      4K Apr 15 17:46 bin
drwxrwxr-x   2 baggio      4K Jan 22 01:36 etc
drwxrwxr-x   9 baggio      4K Jan 22 16:10 include
drwxrwxr-x   4 baggio      4K Jan 22 16:10 lib
drwxrwxr-x   3 baggio      4K Jan 22 01:13 libexec
drwxrwxr-x   6 baggio      4K Jan 22 16:10 share
drwxrwxr-x   2 baggio      4K Jan 22 01:24 usr
drwxrwxr-x   5 baggio      4K Jan 21 22:57 x86_64-pindoramaCOPACABANA-linux-musl
```

Agora, apenas ligue (seja por uma ligação simbólica, seja "binddando" pelo
``mount``(8)) o diretório ``$COPA/cross-tools`` na raiz do sistema de arquivos
da máquina hospedeira. Nesse caso, estaremos utilizando meras ligações
simbólicas por uma questão de praticidade.

```console
[baggio@S145 0v]$ doas ln -s $COPA/cross-tools /
[baggio@S145 0v]$ cd /
[baggio@S145 /]$ ls -l /cross-tools
lrwxrwxrwx   1 root        19 Jan 13  2022 /cross-tools -> /dsk/0v/cross-tools
```

### Baixando o código-fonte

Primeiramente, crie o diretório ``/usr/src`` dentro do disco do Copacabana
(``$COPA``) e então tenha a certeza de que ele tem as permissões do usuário que
você está usando para montar a toolchain intermediária, no nosso caso o
``baggio:wheel`` (ou ``baggio:baggio``, caso seu sistema não tenha o grupo
\```wheel``', ex.: não seja o Copacabana em si).

```console
[baggio@S145 ~]$ mkdir -p $COPA/usr/src
```

Vamos precisar que o usuário \```baggio``' tenha acesso ao diretório ``/usr/src``
(do disco-alvo do Copacabana, só para dar ênfase nisso) pois é neste diretório
que vamos baixar todo o código-fonte necessário para compilar todos os três
estágios. Agora apenas execute o *script* ``cmd/download_sources.bash``, passando
os arquivos "``sources.txt``" e "``sources.sha256``" como parâmetros.

Primeiramente, clone o repositório do Copacabana pelo git:

```console
[baggio@S145 ~]$ git clone http://github.com/Projeto-Pindorama/copacabana.git \
	$COPA/usr/src/copacabana
```

Após isso, entre no diretório ``$COPA``:

```console
[baggio@S145 ~]$ cd $COPA/usr/src/copacabana
```

E então execute o *script*:

```console
[baggio@S145 copacabana]$ bash cmd/download_sources.bash sources.txt sources.sha256
```

***
**Nota**: é recomendável que, enquanto você estiver baixando o código-
fonte, rode o comando ``watch -n1 ls -lR $COPA/usr/src``, para ver o
que está sendo baixado e se o *script* está funcionando.

***

Também crie, após o download, um diretório chamado ``cmp/``, onde
vamos extrair o código-fonte para compilar.

```console
[baggio@S145 copacabana]$ mkdir $COPA/usr/src/cmp
```

***
**Nota sobre o sources.txt**: O arquivo ``sources.txt`` é, como deveria se
esperar, um arquivo com um índice de URLs para *tarballs* contendo código-
fonte, todavia com uma mudança simples que facilita a criação de um
sistema de separação de sources por mantenedor/projeto/utilidade:
um sistema simples de categorização de URLs.  
Vamos supor que, hipoteticamente, você queira adicionar código-
fonte para o KDE, por exemplo.  
Ao invés de ter que fazer marabalismos copiando os arquivos de um
lado para outro, você pode simplesmente adicionar uma nova
categoria no arquivo. Como? É simples.  
Você apenas deve adicionar os arquivos que você deseja obter dentro
de palavras-chave que indicam a categoria deles em si.  

Continuando o nosso exemplo com o KDE...

```
#> pkgs/kde
http://ftp.sourceforge.net/pub/mirrors/kde/snapshots/current/kdebase-20010430.tar.bz2
http://ftp.sourceforge.net/pub/mirrors/kde/snapshots/current/kdelibs-20010430.tar.bz2
%% ... e por aí vai
#< pkgs/kde
```

Uma outra coisa interessante sobre esse arquivo em si é que nele você pode usar
comentários, apenas comece seu comentário com dois sinais de porcentagem
juntos (``%%``) --- disponível em versões do ``cmd/download_sources.bash``
que vieram depois do dia 31 de Março de 2022.  
Mesmo isso não sendo usado oficialmente pelo Copacabana, eu implementei para
caso precise ser usado no futuro.

***

### Desempacotando *tarballs* "101"

Durante todo esse manual, iremos estar descompactando as *tarballs*
por meio de um encanamento de E/S, não apenas com o comando ``tar``(1).
A sintaxe, caso você ainda não conheça, é assim:

```sh
[bzip2,xz,gzip,uncompress,...] -cd arquivo.tar.[bz2,xz,gz,Z,...] | tar -xvf -
```

Isso não é só por uma questão de portabilidade, pois algumas
implementações do ``tar``(1) não têm suporte à descompressão on-the-fly ---
como, por exemplo e até onde eu inicialmente testei, a implementação
encontrada no OpenBSD[^1] --- mas também uma questão de criar o (bom)
costume de não jogar tudo nas mãos do programa que estiver usando.  

Após descompactar a *tarball*, entre em seu diretório. No exemplo
com o ``arquivo.tar``, vamos supor que ele tenha criado um diretório
chamado "``diretorio-arquivo-tar``"; entre nesse diretório e então
execute as instruções dadas aqui no manual, pois eu estou assumindo
que você esteja com o diretório de trabalho (``$PWD``) como o diretório
com o conteúdo da *tarball*, não como o ``/usr/src``, ``/usr/src/cmp`` ou
qualquer outra coisa.  

## Primeira rodada: compilando a toolchain intermediária 

Essa toolchain é __quase__ (ênfase no "quase" pois não teremos um núcleo 
propriamente dito, mas sim um espelhamento do núcleo da máquina hospedeira, além
de outros vários componentes que estarão faltando) um sistema Linux em
*miniroot* que iremos usar para compilar o nosso sistema-base por meio da
Mitzune.  
Compilá-la pode, de primeira, parecer complexo --- falo isso como quem compilou,
apagou e recompilou a mesma diversas vezes em várias máquinas diferentes desde
coisa de Março de 2021 e só foi entender o processo de fato recentemente ---
mas, comparando com o sistema final, é relativamente simples, mas ainda extenso
pois a quantidade de pacotes compilados aqui é quase a mesma que vamos ter que
compilar no sistema final. Pela simplicidade técnica dessa etapa, essa parte vai
ser bem menos tangenciada quanto a próxima.  
Por uma questão de nostalgia, essa é minha parte favorita de compilar.
Ok, vamos lá; isso vai tomar umas duas horas na melhor das hipóteses, então é
bom não nos extendermos muito aqui.  

***
**Nota**: Tenha certeza absoluta de que o diretório ``/tools`` está presente e
ligado simbolicamente (ou "binddado", por meio do ``mount``(8)) tanto no ``/``
da máquina hospedeira quanto no ``/`` do Copacabana (vulgo ``$COPA`` que, no
nosso caso, "vale" ``/dsk/0v``).

Caso ele esteja ligado simbolicamente, deve aparecer assim quando você executar
o comando abaixo.

```console
[baggio@S145 /]$ ls -l /tools
lrwxrwxrwx 1 root root 14 mar 17 14:01 /tools -> /dsk/0v/tools/
```

E, caso ele esteja "binddado" (Ave Maria, preciso de um termo melhor para isso)
por meio do ``mount``(8), ele não deve aparecer como acima com o ``ls``, mas sim
como um diretório comum, um "ponto de montagem" na prática.

```console
[baggio@S145 /]$ ls -l /tools
total 52K
drwxr-xr-x  12 baggio      4K May 21 17:41 .
drwxr-xr-x   1 root       232 Jul  8 20:57 ..
drwxr-xr-x   2 baggio     12K Jun  5 18:35 bin
drwxrwxr-x   3 baggio      4K May  4 23:07 etc
drwxr-xr-x  22 baggio      4K Jun  5 13:52 include
drwxrwxr-x   2 baggio      4K May 29 03:21 info
drwxr-xr-x   8 baggio      4K Jun  2 21:33 lib
lrwxrwxrwx   1 baggio      10 Apr 10 12:18 lib64 -> /tools/lib
drwxrwxr-x   3 baggio      4K May  7 01:45 libexec
drwxrwxr-x   4 baggio      4K May 29 03:21 man
drwxr-xr-x   2 baggio      4K May 27 21:58 sbin
drwxrwxr-x  14 baggio      4K May 29 21:53 share
drwxrwxr-x   5 baggio      4K Apr 20 14:58 x86_64-pindoramaCOPACABANA-linux-musl
[baggio@S145 /]$ file /tools
/tools: directory
```
Para ver se está devidamente bindaddo, você deve usar o ``df``, como no comando
abaixo.

```console
[baggio@S145 /]$ df /tools
Filesystem              kbytes       used      avail capacity Mounted on
/dev/loop3p5           4873220    1775616    2830340      37% /dsk/0v
```

Entretanto, eu recomendaria que você simplesmente use uma ligação simbólica
simples (até porque a toolchain não passa de um mero *hack* perto do sistema
final) e, assim, você evitaria possíveis dores de cabeça --- como, por exemplo,
esquecer de montar o diretório de ``$COPA/tools`` em ``/tools``.

***

### Biblioteca C musl

Pois bem, essa parte não é bem explicada tanto pelo Linux from Scratch quanto
pelo Musl-LFS, mesmo assim vou tentar dar uma explicação sobre o porquê de
compilarmos a musl para essa toolchain e não deixarmos tudo apenas para o final.
Precisamos compilar a musl agora pois, além do fato da ``/cross-tools`` --- sim,
nossa amada toolchain inicial com apenas um compilador, biblioteca C e
cabeçalhos --- não estar disponível no nosso prefixo da Mitzune, nós estaremos
linkeditando bibliotecas dinâmicas nos nossos binários compilados nessa etapa,
essas que devem "apontar" para nossa toolchain intermediária, não para o
sistema-base (ex.: ``/lib/ld-musl-x86-64.so.1``) e nem para a toolchain inicial
(``/cross-tools/lib/ld-musl-x86_64.so.1``), caso contrário teremos o clássico erro
de "``bash: X: No such file or directory``", que é basicamente quando o
interpretador ELF (que, se minha memória não falha, é o ``ldd``(1)) não encontra
a biblioteca que o binário "pede" para ser executado.

Após essa explicação curta, vamos ao que interessa: compilar a biblioteca C e
instalá-la no diretório correto.

#### 1º: Rode o *script* ``configure``

```sh
./configure \
	CROSS_COMPILE=${COPA_TARGET}- \
	--prefix=/ \
	--target=${COPA_TARGET}
```

#### 2º: Compile e instale na toolchain

Compile e instale com o GNU make, como um pacote normal.

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& DESTDIR=/tools gmake install
```

Após instalado, refaça a ligação do ``/tools/lib/ld-musl*.so.1``
para o ``/tools/lib/libc.so``.

```sh
rm -vf /tools/lib/ld-musl-$(uname -m).so.1
ln -s /tools/lib/libc.so /tools/lib/ld-musl-$(uname -m).so.1
```

Isso vai criar uma nova ligação simbólica, dessa vez para o ``libc.so`` na
localização correta.  

***
**Nota para compilações futuras**: Possivelmente a gente poderia evitar isso
usando ``--prefix=/tools``, o que faria com que automaticamente os links fossem
feitos direto de ``/tools/lib/ld-musl-*.so.1`` para ``/tools/lib/libc.so`` e que
não precisássemos usar o ``DESTDIR`` na hora da instalação. Não tenho certeza se
funcionaria, todavia é algo a se tentar no futuro.

***

E, por fim, crie um arquivo para que o linkeditor possa "se achar" e encontrar
as nossas bibliotecas da toolchain.

```sh
mkdir -pv /tools/etc/ \
&& cat > /tools/etc/ld-musl-$(uname -m).path << "EOF"
/tools/lib
EOF
```

### Ajuste básico na toolchain inicial antes de continuar 

Antes de continuarmos, é necessário que nós ajustemos o GCC da toolchain inicial
para usar as bibliotecas da nossa toolchain intermediária.  
Esse processo é análogo --- para não dizer que é literalmente o mesmo, só que
menos extenso --- que o apresentado na parte do sistema-base, então não
entrarei em detalhes sobre o que é o arquivo specs e afins por hora.  

Exporte essas variáveis no seu shell:

```sh
LIBGCC_PATH=$(dirname $(${COPA_TARGET}-gcc -print-libgcc-file-name))
SPECFILE="$LIBGCC_PATH/specs"
```

Agora, faça um despejo do specs padrão do GCC:

```sh
${COPA_TARGET}-gcc -dumpspecs > specs.tmp
```

Então faça a alteração do caminho para a biblioteca de ``/lib`` para
``/tools/lib``:

```sh
sed 's@/lib/ld-musl-x86_64.so.1@/tools/lib/ld-musl-x86_64.so.1@g' < specs.tmp > specs
```

***
**Nota**: O padrão de substituição muda de arquitetura para arquitetura. No
futuro haverá possivelmente uma tabela para cada arquitetura além de x86 de 64
bits.

***

Agora, por fim, mova o nosso specs para a nova localização:

```sh
mv ./specs "$SPECFILE"
unset LIBGCC_PATH SPECFILE
```

Opicionalmente, após esse passo, você pode fazer uma prova real para checar se,
de fato, a biblioteca C linkeditada é a da toolchain.

Primeiro, gera-se um programa simples para ser compilado pelo GCC. Pode ser uma
função ``main()`` vazia, como no Musl-LFS do Derrick, ou, como nessa tabula, um
clone do comando ``true``(1).

```sh
printf 'int main(void) {\n  return 0;\n}\n' > true.c
```

Em seguida, compila-se o mesmo e faz-se uma leitura de suas propriedades com o
``${COPA_TARGET}-readelf``.

```sh
${COPA_TARGET}-gcc true.c -o true
${COPA_TARGET}-readelf -l ./true | grep 'Requesting program interpreter'
```

Essa leitura deve retornar o seguinte resultado:

```
      [Requesting program interpreter: /tools/lib/ld-musl-x86_64.so.1]
```

***
**Nota**: Como dito anteriormente, o nome da biblioteca irá variar para cada
arquitetura (ex.: para 64 bits, será ``ld-musl-x86-64.so.1``; para 32 bits, será
``ld-musl-i386.so.1``; para o Apple M1 (ou qualquer outro ARM de 64 bits) será
``ld-musl-aarch64.so.1`` etc).

***

### GNU Binary Utilities (Binutils)

Não creio que seja necessário explicar a importância das GNU Binutils tanto
nessa toolchain quanto no sistema-base. Um exemplo da importância desse pacote
é que ele contém o linkeditor.  

#### 1º: Exporte as variáveis de ambiente ao fim do ``~/.bashrc``

Vá ao ``~/.bashrc`` (aquele que copiamos do repositório de desenvolvimento do
Copacabana ao começo da compilação cruzada) e, ao fim do arquivo, "descomente"
essa linha:

```sh
export CC CXX AR AS RANLIB LD STRIP
```

E então comente essa:

```sh
unset CC CXX AR AS RANLIB LD STRIP
```

Feito isso, apenas recarregue o arquivo no Shell, como de costume.

```sh
. ~/.bashrc
``` 

Isso fará com que o ``GNUMakefile`` e o ``configure`` "chamem" as nossas
ferramentas da toolchain inicial ao invés das da máquina hospedeira.

#### 2º: Para *targets* de 64 bits, um *hack* com amor

Caso você esteja compilando de (e para) uma máquina de 64 bits x86, faça um
*hack* no sistema de arquivos da toolchain intermediária entre o diretório
``lib/`` e o ``lib64/``.

```sh
ln -s /tools/lib /tools/lib64
```

Isso, no sistema-base, é feito com *binding* entre os dois diretórios, mas como
não vamos nos dar ao trabalho de chamar o ``mount()`` só para algo que é, a
grosso modo, um grande *hack*, simplesmente faça isso.  
Como diria um veterano que conheci, *"Don't overthink"*.

#### 3º: Rode o *script* ``configure`` 

Por algum motivo, antes de se rodar o *script*, o projeto GNU recomenda que você
rode o *script* ``configure`` em um diretório dedicado.  
Essa é uma peculiaridade curiosa --- ou, para ser honesto como quem já manteve
pacotes (extra-oficiais) no Slackware e agora mantém os pacotes oficiais no
Copacabana, uma bela de uma gambiarra --- no processo de compilação da maioria
dos, digamos, "carros-chefe" do projeto GNU, como o GCC, o GNU ncurses ou as
próprias GNU Binutils. 

```sh
mkdir build \
&& cd build \
&& sh ../configure --prefix=/tools      \
             --with-lib-path=/tools/lib \
             --build=${COPA_HOST}       \
             --host=${COPA_TARGET}      \
             --target=${COPA_TARGET}    \
             --disable-nls              \
             --disable-werror           \
             --with-sysroot
```

#### 4º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) && gmake install
```

O próximo passo à instalação do pacote das Binutils é que criemos um novo
binário para o linkeditor, chamado ``ld-new``.  
Essa parte é melhor explicada no ajuste dessa toolchain para a compilação do
sistema-base, mas, dando uma palinha, basicamente vamos criar um binário do
linkeditor com caminhos diferentes para procurar bibliotecas.  
O nosso linkeditor atual tem o ``/tools/lib`` como o caminho para se buscar
bibliotecas pedidas numa compilação, o que é o correto e necessário para essa
etapa, mas o nosso novo linkeditor terá o ``/lib`` e o ``/usr/lib`` como
caminhos a se buscar.  
Sem mais delongas, rode esses comandos:

```sh
gmake -C ld clean
gmake -C ld LIB_PATH='/lib:/usr/lib'
```

Isso vai fazer com que o ``gmake`` aja apenas dentro do diretório ``ld/`` (a
opção ``-C`` no ``gmake`` equivale ao ``chdir()``), presente dentro da
árvore de código-fonte das Binutils, limpe os objetos e binários antigos e então
compile um novo binário para o linkeditor com um novo ``LIB_PATH`` manualmente
configurado por nós --- fun fact: pelo ``configure``, o ``LIB_PATH``
originalmente foi exportado globalmente como ``/tools/lib`` por meio do *switch*
``--with-lib-path``.

Então, por fim, copie o novo binário do linkeditor para a toolchain:

```sh
cp ld/ld-new /tools/bin
```

### GNU Compiler Collection (GCC)

O GNU Compiler Collection é um pacote que contém compiladores para diversas
linguagens. Inicialmente, surgiu como uma reescrita feita pelo Projeto GNU do
compilador C, conhecido como ``cc``(1) no UNIX da AT&T --- e, por conta disso,
ganhou o nome de "gcc", pois os comandos (re)escritos pelo GNU usavam o prefixo
"g". Logo "**``g``**``cc``" seria a versão GNU do comando ``cc``(1).  
Estaremos compilando os compiladores C e C++ do pacote, o que é o suficiente,
por hora --- enquanto as futuras ferramentas em Go não são escritas ---, para
compilar todo o sistema-base.  

#### 1º: Bibliotecas extras (GMP, MPC e MPFR)

O GCC depende nas bibliotecas GMP, MPC e MPFR, que são usadas para que o GCC
possa lidar com aritmética de números complexos, precisão arbitrária e afins.  
Elas não são opicionais e devem ser extraídas para dentro da árvore de
código-fonte do GCC.  

Para isso, apenas extraia cada uma delas dentro do diretório do GCC.  
O comando para extrair é basicamente o mesmo que você usou para extrair o GCC em
si, mas dessa vez você deve usar o *switch* ``-C`` passando o diretório do GCC
como parâmetro.  

Os comandos finais ficariam assim:

```sh
xz -cd $COPA/usr/src/pkgs/gnu/gmp-6.2.1.tar.xz | tar -xvf - -C ./gcc-10.3.1_git20210424/
gzip -cd $COPA/usr/src/pkgs/gnu/mpc-1.2.1.tar.gz | tar -xvf - -C ./gcc-10.3.1_git20210424/
xz -cd $COPA/usr/src/pkgs/gnu/mpfr-4.1.0.tar.xz | tar -xvf - -C ./gcc-10.3.1_git20210424/
```

#### 2º: Aplique os *patches* do Alpine Linux

Esses *patches* foram criados na intenção de corrigir partes do GCC para que tal,
em sua forma completa (como você encontraria numa distribuição como o Slackware,
por exemplo), possa ser compilado na biblioteca C musl sem demais problemas.  
Alguns desses *patches* nós, neste estágio, não iremos usar --- até porque, até
onde sei, não temos nada escrito na linguagem Ada ou D que precise ser compilado
agora usando a musl --- mesmo assim, vamos aplicar todos (porque não custa nada,
nem sequer tempo seu).  

Como eu estou considerando que você esteja usando o GNU ~~Broken~~Bourne-Again
Shell (ou o Korn Shell 93), estarei utilizando um laço de repetição \```for``' no
estilo-C, que nos permite basicamente a pôr toda essa lista de *patches* dentro de
um elegante e (talvez não-tão) compacto (mas belo) arranjo.  

***
**Nota**: Antes de rodar esse trecho de código, lembre-se que estou considerando
que você ainda não está dentro do diretório do GCC, caso já esteja dentro do
diretório do GCC, apenas mude ``-d ./gcc-10.3.1_git20210423/`` por ``-d .``.

***

```bash
p=( '0001-posix_memalign.patch' '0002-gcc-poison-system-directories.patch' \
    '0003-Turn-on-Wl-z-relro-z-now-by-default.patch' '0004-Turn-on-D_FORTIFY_SOURCE-2-by-default-for-C-C-ObjC-O.patch' \
    '0005-On-linux-targets-pass-as-needed-by-default-to-the-li.patch' '0006-Enable-Wformat-and-Wformat-security-by-default.patch' \
    '0007-Enable-Wtrampolines-by-default.patch' '0008-Disable-ssp-on-nostdlib-nodefaultlibs-and-ffreestand.patch' \
    '0009-Ensure-that-msgfmt-doesn-t-encounter-problems-during.patch' '0010-Don-t-declare-asprintf-if-defined-as-a-macro.patch' \
    '0011-libiberty-copy-PIC-objects-during-build-process.patch' '0012-libitm-disable-FORTIFY.patch' \
    '0013-libgcc_s.patch' '0014-nopie.patch' '0015-libffi-use-__linux__-instead-of-__gnu_linux__-for-mu.patch' \
    '0016-dlang-update-zlib-binding.patch' '0017-dlang-fix-fcntl-on-mips-add-libucontext-dep.patch' \
    '0018-ada-fix-shared-linking.patch' '0019-build-fix-CXXFLAGS_FOR_BUILD-passing.patch' \
    '0020-add-fortify-headers-paths.patch' '0022-DP-Use-push-state-pop-state-for-gold-as-well-when-li.patch' \
    '0023-Pure-64-bit-MIPS.patch' '0024-use-pure-64-bit-configuration-where-appropriate.patch' \
    '0025-always-build-libgcc_eh.a.patch' '0026-ada-libgnarl-compatibility-for-musl.patch' \
    '0027-ada-musl-support-fixes.patch' '0028-gcc-go-Use-_off_t-type-instead-of-_loff_t.patch' \
    '0029-gcc-go-Don-t-include-sys-user.h.patch' '0030-gcc-go-Fix-ucontext_t-on-PPC64.patch' \
    '0031-gcc-go-Fix-handling-of-signal-34-on-musl.patch' '0032-gcc-go-Use-int64-type-as-offset-argument-for-mmap.patch' \
    '0033-gcc-go-Fix-st_-a-m-c-tim-fields-in-generated-sysinfo.patch' '0034-gcc-go-signal-34-is-special-on-musl-libc.patch' \
    '0035-gcc-go-Prefer-_off_t-over-_off64_t.patch' '0036-gcc-go-undef-SETCONTEXT_CLOBBERS_TLS-in-proc.c.patch' \
    '0037-gcc-go-link-to-libucontext.patch' '0038-gcc-go-Disable-printing-of-unaccessible-ppc64-struct.patch' \
    '0039-CRuntime_Musl-Support-v1.2.0-for-32-bits.patch' '0040-configure-Add-enable-autolink-libatomic-use-in-LINK_.patch' \
    '0041-Use-generic-errstr.go-implementation-on-musl.patch' \
)

for (( i=0; i < ${#p[@]}; i++ )); do
	printf 'Applying patch no. %s, %s\n' "${i}" "${p[${i}]}"
	patch -Np1 -d ./gcc-10.3.1_git20210424/ < \
		 "$COPA/usr/src/copacabana/patches/gcc-10.3.1_git20210424/${p[${i}]}"
done
```

#### 3º: Regenerando o cabeçalho ``limits.h`` do GCC da toolchain inicial 

Segundo o manual original do Linux From Scratch[^2], o nosso GCC da toolchain
inicial (que, por ele é o "Passo 1" da toolchain intermediária) não tem o
cabeçalho ``limits.h`` --- este que serve para especificar constantes que indicam o
tamanho mínimo e máximo em bits de cada tipo de dado básico (``int``, ``char``,
``short``, ``long`` etc) na memória; é literalmente uma definição de limites
para o compilador[^3] --- completo, mas sim apenas um "cabeçalho-porcelana" que
contém pouquíssimas informações e que, de fato, conta com a existência do
cabeçalho ``limits.h`` completo no diretório de cabeçalhos padrão do sistema
(este sendo o ``$PREFIX/include``, no nosso caso mais especificamente sendo
``/tools/include``). O grande problema é: esse arquivo simplesmente não existe
ainda no nosso ``/tools/include`` e, para compilar o GCC com suporte completo a
C e C++ (o que é mais do que suficiente para compilar o sistema-base),
precisamos desse cabeçalho.

Para gerá-lo, vamos rodar um comando análogo ao que o próprio sistema de *build*
do GCC já executa em seu ``Makefile`` (definida na regra ``stmp-int-hdrs``, no
arquivo ``gcc/Makefile.in``, na linha 3075):

```sh
LIBGCC_PATH=$(dirname $(${COPA_TARGET}-gcc -print-libgcc-file-name))
cat gcc/limitx.h gcc/glimits.h gcc/limity.h \
	> $LIBGCC_PATH/include-fixed/limits.h
```

#### 4º: Modificando o caminho das bibliotecas para o linkeditor

Por último, mas longe de menos importante, devemos apenas trocar o caminho
padrão de bibliotecas que o ``gcc``(1) (não o pacote GCC, mas sim o binário
"``gcc``") vai usar na hora de linkeditar nossos programas (de forma paralela
ao linkeditor das GNU Binutils, o ``ld``(1)), por meio da definição de um macro
chamado ``STANDARD_STARTFILE_PREFIX_1``. Na prática, este macro chama-se assim
pois, de fato, ele é pensado para indicar não apenas o caminho genérico das
bibliotecas, mas sim o caminho dos arquivos ``crt[1in].*`` (abreviação de "C
Run Time") --- a função desses arquivos também será melhor explicada
posteriormente, mas que em resumo são o "começo de tudo", "o que vem antes do
``main()``".[^4] O conteúdo desse macro fará parte, posteriormente, do arquivo
specs padrão (vulgo "*hardcoded*") do ``gcc`` --- coisa que explicarei
melhor mais para frente, na parte do reajuste da toolchain intermediária (sim,
dessa mesmo) para compilar o sistema-base.  

O pequeno *hack* em shell script abaixo faz o serviço. Ele foi adaptado do livro
original do Linux from Scratch --- assim como uma parte considerável dos *hacks*
aqui presentes, com algumas pequenas mudanças, como a clarificação da linha de
comando do ``sed`` e a explicação do que de fato os comandos ali fazem.  

```sh
for i in gcc/config/{linux,i386/linux{,64}}.h; do
  	# Copia o arquivo apenas se o arquivo tiver sua data de
	# criação/edição mais recente que a do arquivo-alvo (ou
	# se o arquivo-alvo não existir, obviamente).
	cp -u "$i" "$i.orig"
  	sed -e 's@/lib\(64\)\?\(32\)\?/ld@/tools&@g' \
		-e 's@/usr@/tools@g' "$i.orig" > "$i"
	cat >> "$i" << "EOF"
#undef STANDARD_STARTFILE_PREFIX_1
#undef STANDARD_STARTFILE_PREFIX_2
#define STANDARD_STARTFILE_PREFIX_1 "/tools/lib/"
#define STANDARD_STARTFILE_PREFIX_2 ""
EOF
	# Altera a data de criação/edição do arquivo .orig,
	# assim nos impede de dar um tiro no pé se rodarmos
	# o laço novamente --- no caso, sobreescrevermos o
	# arquivo original de facto com o arquivo editado
	# que recém criamos, pois o arquivo original agora
	# é mais recente que o arquivo editado.
	touch "$i.orig"
done 
```

***
**Nota para compilações futuras**: O cabeçalho a ser editado, por ser
*machine-specific*, obviamente varia de arquitetura para arquitetura.  
Quando o Copacabana for portado para novas arquiteturas além das baseadas em
x86, deve-se criar uma versão mais portável desse *hack* --- em outras palavras,
um *switch-case* "capenga" (provavelmente) --- para executar o laço nos arquivos
corretos para cada arquitetura.

***

#### 5º: Rode o *script* ``configure``

Assim como nas GNU Binutils, o GCC pede para que você use um
diretório separado para rodar o ``configure`` e fazer toda a
compilação em si, isso porque o configure do GCC teria problemas
em rodar no diretório-raíz da árvore de código-fonte --- ainda sem
prover uma explicação prática para isso, ou seja, meu ponto de que
é apenas uma gambiarra temporária por parte dos mantenedores do GNU
ainda se mantém... Não é à toa que estão indo todos para o LLVM...
Piadas maldosas e implicâncias à parte, vamos para o que interessa.

```sh
ln -s gmp-6.2.1 gmp	\
&& ln -s mpc-1.2.1 mpc	\
&& ln -s mpfr-4.1.0 mpfr	\
&& mkdir build	\
&& cd build
CFLAGS='-g0 -O0'	\
CXXFLAGS=$CFLAGS	\
sh ../configure	\
    --target=${COPA_TARGET}	\
    --build=${COPA_HOST}	\
    --host=${COPA_TARGET}	\
    --prefix=/tools	\
    --with-local-prefix=/tools	\
    --with-native-system-header-dir=/tools/include	\
    --enable-languages=c,c++	\
    --disable-libstdcxx-pch	\
    --disable-multilib	\
    --disable-bootstrap	\
    --disable-libgomp	\
    --disable-libquadmath	\
    --disable-libssp	\
    --disable-libvtv	\
    --disable-symvers	\
    --disable-libitm	\
    --disable-libsanitizer
```

***
**Nota**: Caso você esteja se perguntando o porquê de não estarmos otimizando
o GCC nessa etapa, é porque simplesmente não é necessário --- sem falar que
desabilitar completamente quaisquer otimizações faz da compilação bem mais
rápida.[^5]
Isso foi originalmente adicionado no Musl-LFS do Derrick pelo Firas Khalil
(``firasuke``, o criador do Glaucus Linux) em 5 de Outubro de 2019[^6] e, por ser
uma adição útil, decidi trazê-la também para essa tabula.  

***

#### 6º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) PATH='/bin:/usr/bin:/cross-tools/bin:/tools/bin' \
	&& gmake install
```

No meio do processo de compilação do GCC, segundo o livro do Linux from Scratch,
é executado uma série de *scripts* (presentes dentro do diretório
``fixincludes/``, que são processados pelo Makefile para um único *script*
executável) que servem para "consertar" arquivos de cabeçalho presentes no
sistema (e adicionais diretórios que contenham arquivos de cabeçalho, como no
nosso caso o ``/tools/include``), editando e enviando/salvando essas cópias
editadas em um diretório temporário no diretório de build, para que,
posteriormente, sejam instaladas no sistema (ou qualquer outro alvo/*prefix*, no
nosso caso sendo o ``/tools``). O grande problema disso tudo é que, em alguns
casos, isso **pode** fazer com que alguns arquivos de cabeçalho da máquina
hospedeira acabem indo parar dentro de nossa toolchain.  
Então, só por uma questão de garantia, para evitar que tenhámos arquivos de
cabeçalho da biblioteca C GNU, por exemplo, misturados aos da musl quando
formos compilar algo, rode o comando abaixo.  

Ele primeiro irá apagar todos os diretórios dentro do diretório de cabeçalhos do
GCC e, logo após isso, vai também apagar, caso ajam ocorrências, arquivos
contendo a linha "DO NOT EDIT THIS FILE", que o *script* gerado pelo GCC escreve
em todo arquivo que ele "conserta".  

```console
find $LIBGCC_PATH/include/* -maxdepth 0 -xtype d -exec rm -rf '{}' \; \
&& rm -f $(grep -l 'DO NOT EDIT THIS FILE' $LIBGCC_PATH/include/*) 
```

### Cabeçalhos do núcleo Linux

Por incrível que pareça, não há muito a se fazer nessa parte além de rodar o GNU
Make e copiar os cabeçalhos para a toolchain.  

#### 1º: Gere os cabeçalhos

```console
gmake headers
``` 

#### 2º: Instale-os na toolchain

Apenas copie os arquivos de cabeçalho recém-gerados para a nossa toolchain.

```console
cp -rv usr/include/* /tools/include
```

E, em seguida, remova alguns arquivos que não serão necessários para a
toolchain.

```console
find /tools/include \( -name '.*' -o -name '.*.cmd' \) -exec rm -vf {} \;
rm -v /tools/include/Makefile
```

Esses arquivos em si (com exceção do ``Makefile``, que é bem óbvio) serão
explicados na parte sobre a instalação dos cabeçalhos no sistema-base.

### Ajuste básico no Shell antes de continuar 

Originalmente, essa parte deveria ser um ajuste quase idêntico ao que fizemos
anteriormente na toolchain inicial (``/cross-tools``), todavia na toolchain
intermediária (``/tools``). Entretanto, como nós compilamos o GCC com o macro
``STANDARD_STARTFILE_PREFIX_1`` codificado rigidamente como ``/tools/lib`` nos
arquivos de cabeçalho --- o que significa que ele vai buscar pelas bibliotecas
na toolchain intermediária para linkeditá-las dinamicamente nos binários por
padrão ---, esse ajuste se torna completamente desnecessário (tanto é que o tal
só existe no Musl-LFS do Derrick e não têm muitas explicações, e não no livro
original do Linux from Scratch, nem ao menos de forma "implícita").  
Logo, apenas execute esses dois comandos para reconfigurar a variável ``PATH``.

```sh
unset PATH
export PATH="/tools/bin:/cross-tools/bin:/usr/bin:/bin:/usr/local/bin"
```

### Biblioteca C++ do GNU Compiler Collection 

Essa é a biblioteca padrão do C++ provida pelo GCC e, como você já deveria estar
imaginando, ela é necessária para compilar programas em... C++.  
Não a compilamos posteriormente pois precisávamos linkeditá-la em relação à
biblioteca C instalada nessa toolchain intermediária, não à toolchain principal.  

Essa etapa ainda se passa dentro do diretório do GCC.  

#### 1º: Rode o *script* ``configure``

```sh
mkdir build			    \
&& cd build
sh ../libstdc++-v3/configure        \
    --host=$COPA_TARGET             \
    --target=$COPA_TARGET           \
    --build=$COPA_HOST              \
    --prefix=/tools                 \
    --disable-multilib              \
    --disable-nls                   \
    --disable-libstdcxx-threads     \
    --disable-libstdcxx-pch         \
    --with-gxx-include-dir=/tools/$COPA_TARGET/include/c++/10.3.1
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU m4

Essa é a implementação do Projeto GNU do processador de macros m4, este
que é utilizado normalmente para gerar uma nova saída a partir de um arquivo
de entrada contendo comandos para o interpretador --- geralmente para coisas
como gerar um arquivo ``configure`` através do ``configure.in``.  
A implementação GNU do ``m4``(1) é necessária para as GNU auto\*tools ---
carinhosamente apelidadas no diretório ``/usr/src/pkgs/gnu`` como "autohell" ---,
mais especificamente para o GNU Autoconf, pois este usa extensões criadas pelos
desenvolvedores do Projeto GNU que não estão presentes em implementações
alternativas, como a do OpenBSD ou a do Heirloom --- o que não é especificamente
um problema para os usuários que irão rodar o *script* ``configure``, mas sim
para nós, que estamos no papel de mantenedores e que estamos a gerá-los.[^7]

#### 1º: Rode o *script* ``configure``

```sh
sh configure --prefix=/tools    \
	     --host=$COPA_TARGET \
	     --build=$COPA_HOST
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU ncurses

Essa é a nossa implementação de uma biblioteca compatível com a biblioteca
curses presente no UNIX SVR4.  
Em termos mais simplórios, é apenas uma reimplementação de código-aberto (e numa
licença livre, a MIT[^8]) de uma biblioteca/API usada para criar interfaces de
terminal no UNIX; é usada em diversas aplicações, se bobear você está usando
nesse exato momento uma aplicação que tem essa biblioteca como dependência
para ler essa tabula.  

#### 1º: Rode o *script* ``configure``

```sh
sh configure --prefix=/tools	\
    --host=$COPA_TARGET		\
    --build=$COPA_HOST		\
    --with-shared		\
    --without-debug		\
    --without-ada		\
    --enable-widec		\
    --enable-overwrite
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

Para evitar dores de cabeça futuramente, faça um *hack* no sistema de arquivos
que ligue o arquivo ``libncursesw.so`` a um novo ponto --- não digo "arquivo"
pois não há um arquivo propriamente dito --- chamado ``libcurses.so``.  
Caso você não faça isso agora, você terá problemas na hora de compilar o Vim, na
parte do ``configure``, onde ele busca por uma biblioteca curses compatível.

```sh
ln -s /tools/lib/libncursesw.so /tools/lib/libncurses.so
ln -s /tools/lib/libncursesw.so /tools/lib/libcurses.so
```

### Almquist shell (vulgo A Shell, ``ash`` ou simplesmente ``sh``(1))

Esta é a nossa implementação de um shell POSIX que iremos utilizar nessa
toolchain, por ser pequena e funcional o bastante. Mais especificamente,
estaremos utilizando a bifurcação do Almquist shell originalmente feita pelo
Hebert Xu em 1997 --- e mantida até hoje ativamente, inclusive é utilizada como
parte do sistema-base do Debian Linux ---, conhecida como "dash"; essa
bifurcação adiciona várias correções para que funcione no Linux, além de ter
suporte à algumas extensões não-POSIX (``echo -n``, ``local`` etc)[^9] e trazer
suporte à histórico e edição de linha de comando por meio do GNU Readline (o
que não iremos habilitar neste momento, por não ser necessário).  

Habilitar o uso da biblioteca GNU Readline não será necessário pois este shell
será utilizado apenas para *scripting*. Nosso shell para uso interativo será o
``oksh``/``pdksh``, provido pelo lobase, que é um tanto mais completo que o
Almquist shell para esse tipo de aplicação.  

#### 1º: Rode o *script* ``configure``

```sh
sh configure --prefix=/tools \
	--without-libedit
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install \
	&& ln -s /tools/bin/dash /tools/bin/sh
```

### GNU Bison

O GNU Bison é um compilador-de-compilador; em termos literais, ele gera um
compilador/interpretador/analisador de sintaxe/*parser* a partir de um arquivo
inicial contendo instruções para que tal coisa seja feita --- __análogo__ *ma non
uguale* ao m4, afinal, por mais que ambos processem padrões informados em um arquivo
de entrada para um de saída, têm funcionamento interno diferente no que se diz a
algoritmos implementados, recursos e flexibilidade em si; por mais que, a mero título
de curiosidade, seja completamente possível se utilizar um processador de macros no
lugar de um compilador-de-compilador em ambientes onde você não tenha um presente,
como descrito no informe *"A General-Purpose Macro Processor as a Poor Man's
Compiler-Compiler"* de Andrew S. Tanenbaum de Junho de 1976.[^10]
Originalmente ele foi criado por Robert Paul Cobbert no ano de 1985, como parte
de sua tese de doutorado, nomeada *"Static Semantics and Compiler Error Recovery"*,
acerca de novas técnicas para recuperação de erros em compiladores gerados por
compiladores-de-compilador. Segundo seus testes, o Bison geraria
compiladores-de-compilador mais rápidos, além de fazer isso em um tempo menor por
se utilizar de algoritmos mais modernos; a ideia original, segundo Cobbert, era
que se pudesse, digamos, "adaptar" o código original do Yacc para que este passasse
a utilizar essas novas técnicas de recuperação de erro mas, como essa modificação
se provou extremamente difícil e contraproducente de se fazer na base de código do
Yacc pela forma que tal foi implementado --- em suas próprias palavras, suas
funções estavam muito "emaranhadas" entre si ---, ele preferiu escrever um novo
compilador-de-compilador do chão.[^11]  
Posteriormente, por volta de 1987 (segundo o manual oficial do Bison, provido
pelo Projeto GNU), Richard Stallman resolveu fazer algumas alterações para que a
interface do Bison se tornasse compatível com a do Yacc.[^12]

#### 1º: Rode o *script* ``configure``

```sh
sh configure --prefix=/tools    \
	     --host=$COPA_TARGET \
	     --build=$COPA_HOST
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### bzip2

bzip2 é uma ferramenta para compressão de arquivos, à lá xz e gzip, desenvolvida
inicialmente pelo desenvolvedor britânico Julian Seward no ano de 1996. Antes da
chegada do xz, o bzip2 era, segundo sua página principal, um dos compressores mais
rápidos e eficientes disponíveis gratuitamente e livre de patentes. Em contraste
ao gzip (e, anacronicamente, ao xz), o bzip2 faz uso do algoritmo BWT
("Método de **B**urrows–**W**heeler", em português).  
Nós instalaremos ela na toolchain pois alguns pacotes --- como, por exemplo, o
Heirloom Toolchest --- estão compactados por tal.  

#### 1º: Compile e instale na toolchain

Primeiramente, precisamos fazer algumas pequenas correções rápidas no Makefile
utilizando o ``sed``(1).  
Renomeie o arquivo de "``Makefile``" para "``Makefile.orig``", para que tenhamos
uma cópia de segurança para caso algo quebre.  

```console
mv Makefile Makefile.orig
```

Então edite-o com o ``sed``(1), mas dessa vez enviando a saída do sed para um
novo arquivo chamado "``Makefile``".  

```sh
sed -e '/^all:/s@ test@@' \
	-e 's@\(ln -s -f \)$(PREFIX)/bin/@\1@' \
	 -e 's@(PREFIX)/man@(PREFIX)/share/man@g' < Makefile.orig > Makefile
```

Essa linha do sed faz o seguinte:

* ``/^all:/s@ test@@``: Busca pela linha contendo o padrão ``all:`` --- que, em
nosso Makefile, é um alvo --- e então substitui o padrão `` test`` por ```` (ou
seja, por nada, em outras palavras remove completamente o padrão `` test`` dessa
linha. Isso é feito para que o Makefile não rode os testes, possivelmente
evitando algum erro de execução ou simplesmente acelerando essa parte;
* ``s@\(ln -s -f \)$(PREFIX)/bin/@\1@``: Esse comando não é bem explicado nem
  pelo manual do Linux from Scratch e nem pelo Musl-LFS do Derrick, mas
teoricamente ele deveria "garantir que as ligações simbólicas são relativas e
não exatas"[^13] (ex.: a ligação simbólica do arquivo ``x`` para o ponto ``y``
no sistema de arquivos não iria para ``/tools/bin/y``, mas sim para ``y`` apenas).  
A palavra-chave ``\1`` do sed é utilizada para se referir ao primeiro grupo de padrões
dentro de um par de parênteses "escapadas" (``\(\)``)[^14] --- este, no caso, sendo
``\( ln -s -f \)``. Então, neste caso, teoricamente iríamos trocar ``ln -s -f
$(PREFIX)/bin/`` por ``ln -s -f``...? Hmmm, faz sentido considerando que assim a
nossa ligação seria apenas entre arquivos, não entre o caminho
``$(PREFIX)/bin/<arquivo>`` completo;
* ``s@(PREFIX)/man@(PREFIX)/share/man@g``: Essa é clássica; nós apenas mudamos o
  caminho para as páginas de manual de ``$(PREFIX)/man`` para
``$(PREFIX)/share/man``, o que vai facilitar nossa vida quando formos remover
arquivos de documentação da nossa toolchain posteriormente. 

Após essa alteração no Makefile principal, antes de compilarmos o resto,
precisamos (pré-)compilar uma versão dinâmica da libbz2. Isso é extremamente
simples, apenas rode o GNU make com o parâmetro ``-f`` para usarmos o Makefile
da libbz2, logo em seguida limpe o código-fonte.  

```sh
gmake -f Makefile-libbz2_so -j$(grep -c 'processor' /proc/cpuinfo) \
	AR=$AR \
	CC=$CC \
	RANLIB=$RANLIB \
	&& gmake clean
```

E, por fim, o de sempre:

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	AR=$AR \
	CC=$CC \
	RANLIB=$RANLIB \
	&& gmake install PREFIX=/tools
```

### Heirloom Toolchest (Coreutils parte I)

Sem nenhum exagero: essa foi a parte mais difícil de se ter funcionando na
toolchain. Foram quase 2 anos --- o quê? Desde Setembro de 2020, né? ---
estudando e rachando a cara com erros de compilação, principalmente de linkedição.  
Graças à minha persistência, ao fato de eu ser cabeça-dura, a alguns *patches*
básicos de um *hacker* conhecido como ``ryanwoodsmall``[^15] (e, possivelmente,
intervenção direta do Senhor), eu consegui pôr o Heirloom Toolchest para
funcionar tanto linkeditado dinamicamente na toolchain --- como iremos fazer
agora --- quanto linkeditado __estaticamente__ (isso mesmo, estático! Com
direito ao [n]curses e tudo mais) no sistema-base.[^16]  

***
**Nota para compilações futuras**: No futuro, seria bom se o grande ``.patch``
que criei fosse dividido em várias partes, um arquivo para cada correção.  

***

#### 1º: Aplique os *patches*

Como eu falei anteriormente, em um grande resumo, esses *patches* são essenciais
para que o Heirloom compile.  

***
**Nota**: Assim como quando aplicamos os *patches* no GCC, lembre-se de que
estou considerando que você ainda não está dentro do diretório-alvo --- no
nosso caso, do Heirloom ---, caso já esteja dentro do diretório do Heirloom,
apenas mude ``-d ./heirloom-070715/`` por ``-d .``; enfim, coisa padrão.  

***

```sh
patch -p1 -d ./heirloom-070715/ < \
	"$COPA/usr/src/copacabana/patches/heirloom-070715/heirloom-070715_tools.patch"
```

#### 2º: Compile (rezando) e instale na toolchain

Rode o GNU make __sem__ paralelização. Caso você paralelize, o ``oawk`` irá
falhar em compilar.  
Isso ocorre porque, quando você compila o ``oawk``, ele primeiro precisa ser gerado
a partir de arquivos processados pelo Yacc, estes que não geram só os arquivos
``.c`` principais, mas também o cabeçalho ``awk.h``, que é "chamado" pela diretiva
``#include`` em todos --- senão todos, a maioria --- os arquivos principais, e cá
mora o problema: quando paralelizado, o Makefile gera, antes do cabeçalho, os arquivos
``.c`` principais --- isso enquanto, teoricamente, processaria esse cabeçalho pelo Yacc
--- fazendo com que os arquivos ``.c``, que são gerados mais rapidamente, sejam compilados
antes do cabeçalho que eles "chamam" sequer ser gerado, assim resultando no erro fatal
"``awk.h: No such file or directory``".  
Isso é mais uma nota de rodapé do que um fato útil em específico, mas achei que fosse
interessante citar para alguém que quisesse uma explicação exata do porquê.

```console
gmake
```

Logo após, rode o GNU make com o alvo ``install``, que irá "instalar" os binários
criados no diretório corrente para um subdiretório denominado "``tools/``".

```console
gmake install
```

Então, com todos os arquivos dentro do diretório ``tools/`` (ainda dentro do
diretório do Heirloom, __não__ na toolchain), faça o seguinte:

Entre no diretório:

```console
cd tools/
```

Crie um diretório chamado ``bin/``:

```console
mkdir bin
```

E então rode esse laço de repetição \```for``':  

```sh
for i in s42bin pbin p2k1bin 5bin ucb_bin sbin; do
	mv -v $i/* bin/ \
		&& rmdir $i
done
```  
Isso irá copiar, em ordem, todos os binários criados pelo Heirloom.  
Alguns binários irão sobreescrever outros (como, por exemplo, os binários da UC
Berkeley irão sobreescrever os binários POSIX), mas não há problema nenhum nessa
parte pois eles estarão funcionais para o que nós iremos fazer no chroot.  
No sistema-base, iremos ter todos eles intactos em seus devidos diretórios, mas
por hora isso não é necessário.  

Agora, mova o diretório ``usr/man`` para ``share/man``.

```console
mv usr share
```

E, por fim, copie tudo para a nossa toolchain em ``/tools``.

```sh
cp -rvf ./* /tools/
```

***
**Nota para compilações futuras**: Nós poderíamos remover a implementação do
``file``(1), partindo do princípio que nós já iremos compilar uma implementação
independente do ``file``(1) --- e muito mais completa, diga-se de passagem --- e que
essa implementação do Heirloom acaba por não funcionar na toolchain em si.  
Todavia, **talvez** nós poderíamos ter a implementação do ``file``(1) do
Heirloom presente no sistema-base, mesmo ela sendo consideravelmente mais
simples do que a que a maioria das distribuições atuais usa.   

***

***
**Nota para mim mesmo no futuro**: Consertar o ``rm``(1) do Heirloom e outras
ferramentas para que sigam o último padrão POSIX, assim, no caso do ``rm``(1),
vou acabar corrigindo erros como o clássico "Your 'rm' program is bad, sorry."
("Seu programa 'rm' é ruim, perdão.", em tradução literal)[^17] e não teremos de
substituí-las pelas ferramentas do lobase no sistema-base --- por mais que,
para isso, você possivelmente terá de ter mais conhecimento sobre C do que tem
atualmente.  
... Ou simplesmente deixar isso de lado, afinal esse "bug" surgiu como resultado
de *scripting* em Shell feito de forma porca (com todo o respeito aos
(pseudo-)"intelectuais", "bacharelados" e "profissionais" de ego frágil, e aos
porcos também --- afinal, estes não são bestas ao quadrado[^18] para se
ofenderem com uma crítica técnica), onde os programadores tendiam a simplesmente
rodar o ``rm``(1) passando uma variável (no exemplo, ``$file``) como parâmetro,
sem mais nem menos:

```sh
rm -f $file
```  

Sendo que o ideal seria que se testasse se o arquivo sequer existe antes de
rodar o comando de fato:

```sh
test -e "$file" && rm -f $file
```   

E, em último caso, caso se precise rodar *scripts* que não testem seus arquivos
antes de deletá-los, nós poderíamos ter uma forma de se instalar o lobase
completo (ou alguma implementação de ferramentas UNIX® alternativa que siga essa
nova norma do POSIX, como as uutils) disponível no pacote de desenvolvimento.  
Essa é uma solução bem mais puxada para o "o que não está solucionado,
solucionado está", então talvez eu reconsidere ela.

***

### lobase (Coreutils parte II)

O lobase (possivelmente uma abreviação para *"**L**inux port of **O**pen**B**SD
b**ase** system"*) serve para suprir alguns programas que não estão presentes ou
não estão de acordo com a última norma do POSIX no Heirloom --- como, por exemplo,
o ``which``(1), que simplesmente não existe, ou o ``rm``(1), o qual não está de
acordo com a última norma POSIX --- problema sobre qual dissertei no passo do
Heirloom.  
Vamos compilá-lo nessa etapa pois o mesmo nos supre, além dessas ferramentas, um
``rm``(1) que está de acordo com a nova norma do POSIX, ``mv``(1), ``cp``(1) e
``ln``(1) com suporte à *verbose* e uma implementação simples do Korn Shell com
suporte a histórico.  

#### 1º: Aplique os *patches*

Esse *patch* basicamente faz com que sejam compilados apenas os programas que
precisamos para a toolchain.

***
**Nota**: Assim como quando aplicamos os *patches* no GCC e, num passo atrás, no
Heirloom, lembre-se de que eu estou considerando que você ainda não esteja dentro
do diretório-alvo --- no nosso caso atual, do lobase ---, então caso você já esteja
dentro do diretório do lobase em si, apenas mude
``-d ./stripped-lobase-20180406-original/`` por ``-d .``; enfim, o mesmo de
antes.  

***

```sh
patch -p1 -d ./stripped-lobase-20180406-original/ < \
	"$COPA/usr/src/copacabana/patches/lobase-20180406/lobase-20180406_tools.patch"
```

#### 2º: Rode o *script* ``configure``

```sh
sh ./configure --prefix=/tools
```

#### 3º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) && gmake install
```

### New AWK (vulgo BWK AWK, "One true AWK" ou simplesmente ``nawk``(1))

O New AWK (também chamado de ``nawk`` pela Internet afora) é uma implementação
de um interpretador para a linguagem de programação AWK, criada pelos mesmos
desenvolvedores do AWK original (presente no Heirloom Toolchest como ``oawk``,
originalmente criado em 1977) por volta de 1985, pelo o que a edição 1.0 do
*"The AWK Manual"* afirma[^19], trazendo à linguagem novos recursos e corrigindo
algumas falhas de desenho da versão antiga. 
Estaremos usando essa versão pois, além dela ser menor do que o GNU AWK, ela é
mantida ativamente e contém a maioria dos recursos que o GNU AWK oferece --- e,
além do mais, dificilmente encontraremos algum programa que use uma função
específica do GNU AWK (como ``--bignum``, por exemplo[^20]) no sistema de
compilação.  
Então, em suma, essa implementação, até onde testei nos últimos 5 a 6 meses, cai
como uma luva para nossa toolchain intermediária.

#### 1º: Pequeno ajuste no ``makefile``

Apenas comente a declaração da variável ``CC`` (*"**C** **C**ompiler"*) no
Makefile, para que possamos compilar o programa com a certeza absoluta de que
estamos utilizando o compilador da toolchain.

Se tirássemos um *diff* do resultado final, ficaria assim:

```diff
--- makefile.orig       Sun May  8 11:16:02 2022
+++ makefile    Sun May  8 11:16:16 2022
@@ -30,7 +30,8 @@
 #CC = gcc -Wall -g -Wwrite-strings
 #CC = gcc -O4 -Wall -pedantic -fno-strict-aliasing
 #CC = gcc -fprofile-arcs -ftest-coverage # then gcov f1.c; cat f1.c.gcov
-CC = gcc -g -Wall -pedantic 
+#CC = gcc -g -Wall -pedantic
```

#### 2º: Compile e instale na toolchain

Rode o GNU Make como normalmente, mas passando a declaração ``CC=$CC`` antes de
executar o comando, assim o GNU Make tem a declaração explícita de que é para se
usar o ``CC`` declarado na linha de comando.

```sh
CC=$CC gmake -j$(grep -c 'processor' /proc/cpuinfo)
```

Como o Nawk não tem um alvo ``install`` no Makefile, nós teremos como resultado
um arquivo chamado ``a.out``:

```console
[baggio@S145 awk-20180827]$ lc -lt
total 7588
-rwxrwxr-x   1 baggio    141272 May  8 13:08 a.out
```

Logo, devemos instalar manualmente.  
Apenas execute os comandos abaixo:

```sh
cp -v a.out nawk \
	&& install -m755 nawk /tools/bin \
	&& ( \
		cd /tools/bin \
		&& ln -v nawk awk \
		&& cd - \
	) \
	&& rm -v nawk \
&& install -m444 awk.1 /tools/share/man/man1 \
&& gmake clean
``` 

### File 

Essa é uma (das várias) implementações do comando ``file``(1), que iremos
compilar para substituir a implementação do Heirloom presente atualmente na
toolchain.  
Ela foi escrita originalmente por Ian Darwin em 1986[^21] --- e, desde então, sido
atualizada frequentemente ---, como uma reimplementação de código-aberto do
comando ``file``(1) presente na versão 4 do Research UNIX.  

***
**Nota para compilações futuras**: Caso seja de interesse, talvez possamos
substituir essa implementação pela implementação presente no OpenBSD, e que já
foi portada para Linux.[^22]

***

***
**Nota**: No manual original do Linux from Scratch e no Musl-LFS do Derrick, que
usam ferramentas do Projeto GNU, o File é compilado __antes__ do AWK e das GNU
Findutils[^23] --- essas que não compilamos pois tanto o Heirloom Toolchest
quanto o lobase já nos provem ferramentas análogas ---, isso porque o sistema de
compilação do GNU depende do comando ``file``(1) para fazer algumas
verificações --- as quais não vou conseguir precisar exatamente pois... o
arquivo configure gerado pelo GNU auto\*tools é enorme; mas sei que o
comando ``file``(1) é utilizado pois, numa das primeiras toolchains --- lá por
volta de Março de 2021 ---, eu havia esquecido de compilá-lo e obtive um erro na
compilação das GNU Binary Utilities (Binutils), essas que, assim todos os outros
projeto formais do GNU, usam as auto\*tools.

***

#### 1º: Rode o *script* ``configure``

```sh
sh configure --prefix=/tools    \
	     --host=$COPA_TARGET \
	     --build=$COPA_HOST
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### gettext-tiny 

O gettext-tiny é uma reimplementação alternativa, distribuída numa licença mais
liberal[^24] e consideravelmente menor, criada pela equipe da distribuição
Sabotage Linux a fim de ter uma alternativa à suíte GNU gettext essa que,
segundo os criadores do gettext-tiny, demora horas para compilar em máquinas
mais lentas e que é incrivelmente bloatada em comparação com a implementação
deles[^25]. 
Estaremos usando essa alternativa no sistema-base do Copacabana por uma questão
de praticidade, mas possivelmente você também poderia usar a implementação do
Projeto GNU sem nenhum empecilho.

#### 1º: Compile e instale na toolchain

Esse pacote --- assim como o do bzip2, do Heirloom Toolchest e vários outros ---
não tem um *script* ``configure``, então apenas teremos de executar o GNU Make
informando nosso prefixo e qual a LibIntl que queremos.  
No caso, a opção ``LIBINTL=MUSL`` faz com que o gettext-tiny apenas compile uma
camada de compatibilidade (no caso, "símbolos" --- esses que são endereços na
memória para funções num arquivo de objeto (vulgo biblioteca, abrindo parênteses
dentro de parênteses) que são utilizados quando se linkedita um programa
dinamicamente[^26]) entre a LibIntl embutida nas versões mais recentes da
biblioteca C musl e programas que usam símbolos específicos da suíte do Projeto
GNU. 

```sh
gmake LIBINTL=MUSL \
	prefix=/tools \
	-j$(grep -c 'processor' /proc/cpuinfo)
```

O nosso Makefile tem um alvo ``install``, todavia o Musl-LFS do Derrick passa
instruções para uma instalação manual.  
Neste caso, ao contrário do Musl-LFS, estaremos usando o comando ``install``
para essa tarefa, não o ``cp``. 

```sh
for i in 'msgfmt' 'msgmerge' 'xgettext'; do
	install -m755 $i /tools/bin
done
```

### Sortix libz (bifurcação da zlib)

A libz do Sortix (irei chamar de "libz", para manter as coisas mais simples) é
uma bifurcação da zlib que contém diversas mudanças, entre elas uma limpeza
considerável no código, que vai desde a remoção de algumas abstrações (como
``z_const`` e ``z_NULL``, por exemplo), reestruturação de sintaxe (de C K&R para
C ANSI) e a remoção do suporte para plataformas antigas e sistemas
não-UNIX-compatíveis[^27]; o que faria da biblioteca consideravelmente mais
segura e pequena.  
A libz foi criada dentro do desenvolvimento do sistema operacional Sortix em
2015, por Jonas Termansen e posteriormente teve contribuições de outros
*hackers* envolvidos com o Sortix.[^28]  
Eu não estarei dando uma explicação/introdução à existência da zlib original em
si, pois isso eu já fiz na etapa do pigz, que vem após essa.  

Estaremos utilizando-a porque cai como uma luva tanto para o sistema-base
quanto para essa toolchain.  

***
**Nota**: É necessário compilar a libz antes do pigz, já que a árvore de
código-fonte do pigz não provê uma versão da zlib para linkeditar --- ou seja, o
pigz espera que já tenha a zlib (ou algo equivalente, como a libz) instalado no
prefixo onde ele será instalado --- no nosso caso, o ``/tools``.

***

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	CC=$CC \
	CXX=$CXX \
	AR=$AR \
	AS=$AS \
	RANLIB=$RANLIB \
	LD=$LD \
	STRIP=$STRIP
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### pigz 

O pigz é uma reimplementação escrita do zero em 2007[^29] por Mark Adler (e
licenciada numa licença mais liberal[^30] do que a da implementação original
do Projeto GNU) do gzip e 100% compatível com o mesmo, mas com suporte à
paralelização[^31].

***
**Nota**: Em um gigantesco resumo feito por alguém que está vendo paralelismo
recentemente em Golang (e que ainda não entende muito), basicamente ele usa
todo o potencial de CPUs mais modernas --- ou seja, com dois ou mais núcleos ---
dividindo a "carga" das instruções do código entre vários outros processos
menores que são executados simultaneamente --- o que se chama de "fio de
execução" (ou *thread*, no inglês do Rei) --- assim fazendo com que a
execução da tarefa ocorra mais rapidamente e utilize a máquina de forma mais
eficiente. Essa parte está um tanto vaga, talvez no futuro eu complemente-a
melhor --- talvez quando entrar na faculdade de fato.  

***

O gzip original foi escrito originalmente em 1992 e teve sua versão estável
publicada em 1993[^32] por Jean-loup Gailly e Mark Adler[^33] (exatamente o
mesmo cara que fez o pigz 15 anos depois, "arredondando"). Para ser mais
exato, Jean-loup teria escrito o algoritmo de compressão  e Mark o algoritmo de
descompressão da zlib (utilizada no gzip (e, abrindo parênteses dentro de
parênteses, posteriormente em centenas de outras aplicações, entre elas o
pigz))[^34] --- todavia, essa parte se torna um tanto ambígua/incompleta, pois,
enquanto a página oficial do Projeto GNU diz apenas que "Adler escreveu a parte
de descompressão", sem deixar claro se ele escreveu um algoritmo ou o comando
``gunzip``(1) ou até mesmo os dois, a página principal da zlib deixa claro que
Jean-loup trabalhou na parte de compressão e Mark na de descompressão **da
biblioteca**, sem mais nem menos.  
O gzip (e a zlib) foram criados inicialmente como uma tentativa de se criar uma
alternativa completamente livre --- sem patentes ou *royalties* --- aos comandos
``compress``(1) e ``uncompress``(1), presentes em diversos sistemas
UNIX-compatíveis.  
Só tinha um único problema nessa história: ao contrário de outros
programas/comandos já antes reimplementados, o algoritmo empregado, o LZW
(**L**empel–**Z**iv–**W**elch), estava protegido sob patentes de propriedade da
Unisys e da IBM[^35] --- essas que eventualmente expirariam em 20 de Junho de
2003 nos Estados Unidos da América[^36], coisa de aproximadamente 11 anos depois
do lançamento da zlib, o que seria, num momento de popularização da Internet e
da necessidade de transferir arquivos (principalmente imagens, no meio mais
convencional/doméstico de usuários), uma espera impraticável e que faria
qualquer desenvolvedor que precisasse de compressão em seu programa refém da
Unisys ou de algum algoritmo de compressão inferior em velocidade ou taxa de
compressão durante esse tempo ---, o que impedia que ferramentas pudessem
utilizá-lo sem permissão prévia mediante pagamento de uma taxa fixa e 1,5% (ou
0,15 US$, o que fosse maior ao fim da soma do total) por cópia distribuída e
registrada --- isto **apenas** para aplicações envolvendo GIFs, não usando o
usando o algoritmo independentemente.[^37]  
No meio dessa correria, após várias tentativas e ideias (inclusive a de
"descompatar" os arquivos GIF) resolveu-se criar uma biblioteca completamente
livre, implementando um algoritmo sem patentes e que pudesse substituir
completamente o LZW. Se acabou com a zlib implementando o DEFLATE, esse que se
provou mais eficiente que o LZW --- tal afirmação é feita pelo *website*  do gzip,
todavia não ligando a nenhum outro artigo que mostre, por meio de *benchmarks*
ou *footprints*, a superioridade do DEFLATE em relação ao LZW; por mais que, por
experimentos empíricos, possamos constatar que é verdade.   

#### 1º: Pequeno ajuste no ``Makefile``

Assim como no New AWK, devemos comentar a declaração da variável ``CC`` --- essa
estando na linha 1 do arquivo ``Makefile``, assim podemos declarar ``CC=$CC``,
fazendo explicitamente com que o GNU Make use o compilador da toolchain.  

Não creio que seja necessário tirar um *diff* do arquivo original em comparação
com o inicial nesse caso.

#### 2º: Compile e instale na toolchain

O pigz, por ser um programa portável, não faz uso do GNU auto\*tools --- ou
seja, ele não tem um script ``configure`` ---, então é só rodar o GNU Make.  

```sh
CC=$CC gmake -j$(grep -c 'processor' /proc/cpuinfo)
```

Como o Makefile do pigz não tem um alvo ``install``, teremos de instalar
manualmente (assim como no New AWK, inclusive o *hack* em Shell será semelhante).  

```sh
for i in pigz unpigz; do
	install -m755 $i /tools/bin
done \
&& ( \
	cd /tools/bin \
	&& ln -v pigz gzip \
	&& ln -v unpigz gunzip \
	&& cd - \
) \
&& install -m444 pigz.1 /tools/share/man/man1 \
&& gmake clean
```

### XZ-Utils do Tukaani

Esse pacote provê a ferramenta de compressão xz entre algumas outras,
que funciona nos moldes do gzip e, como disse antes, do bzip2. Diferentemente do
gzip e do bzip2, o xz faz uso do algoritmo LZMA/LZMA2 (**L**empel–**Z**iv–**Ma**rkov).  
Estaremos instalando-o pois alguns pacotes --- entre eles, o próprio núcleo
Linux --- estão compactados com o xz.

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--target=$COPA_TARGET \
	--build=$COPA_HOST
```

#### 2º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU Make

O GNU Make provê uma implementação livre da ferramenta Make --- que originalmente
teria surgido na 7ª versão do UNIX da AT&T[^38], a fim de auxiliar no processo de
se manter programas que fossem montados a partir de várias operações seguidas
numa certa quantidade de arquivos[^39], o que acabou por facilitar e muito a
vida de programadores e não-programadores (até porque o Make não necessariamente
precisaria ser usado para código-fonte, mas também para documentos em Roff por
exemplo) no futuro --- que foi criado(?) (se bifurcado da árvore de código-fonte
de outro programa maior já existente ou se foi escrita na mão do zero, não sei
informar ao certo; não ficou muito claro no registro de mudanças (``ChangeLog.1``))
em 1988 por Roland McGrath[^40] e, posteriormente (apenas após 1995, pelo o que
consta no arquivo ``ChangeLog.2``[^41]) recebeu algumas contribuições de Richard
Matthew Stallman.

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--without-guile \
	--host=$COPA_TARGET \
	--build=$COPA_HOST
```

#### 2º: Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### Patch (do lobase)

O Patch é uma ferramenta para aplicar correções (no inglês do Rei, *patches*) em
arquivos individuais ou em árvores inteiras de arquivos --- não necessariamente
código-fonte, podendo ser texto-puro por exemplo.  
A implementação do lobase veio, assim como todo o pacote em si, do OpenBSD ---
mais especificamente foi importado da árvore de código-fonte na versão 6.3 --- a
qual surgiu em 1996 em seu primeiro lançamento, baseada no patch12u8, que ainda
não era licenciada sob a GNU GPL e, posteriormente, foram mantendo essa versão
em paralelo com a implementação do GNU.[^42]

#### 1º: Compile e instale na toolchain

Como o código-fonte em si já está presente no diretório do lobase, não deve se
ter nenhum esforço adicional além de entrar no diretório ``usr.bin/patch`` e
executar o GNU Make.  

```sh
cd "$COPA/usr/src/cmp/stripped-lobase-20180406-original/usr.bin/patch" \
	&& gmake clean \
	&& gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& install -m755 ./patch /tools/bin \
	&& install -m444 patch.1 /tools/share/man/man1 \
	&& gmake clean \
&& cd -
```

### GNU sed

***
**Nota**: No Musl-LFS do Derrick (e muito possivelmente também no livro do Linux
from Scratch), ele espera que você ainda não tenha o sed na toolchain e que você
tenha o GNU sed na máquina hospedeira, por isso o GNU sed vem após o Perl; mas,
no Copacabana, nós já temos uma implementação do ``sed``(1) vinda do Heirloom
que, pela hierarquia do ``$PATH``, "sobrepõe" a da máquina hospedeira (esperada
ser a do GNU) e faz com que tenhamos que compilar o GNU sed antes.  

***

***
**Nota**: O GNU sed será necessário para fazer a compilação cruzada do Perl, pois num dos
scripts ele aparentemente usa extensões do GNU para fazer a checagem de versão.  
Infelzimente, o ``sed``(1) do Heirloom e o do ``sed``(1) do lobase não funcionam
por motivos distintos. O ``sed``(1) do Heirloom dá um erro dizendo que a opção
``-r`` --- que, no GNU sed, significa "usar expressões regulares
extendidas"[^43] --- não está implementada/é uma opção ilegal ("``sed:  illegal
option -- r``"); já, o ``sed``(1) do lobase acaba não processando corretamente
os comandos --- não por culpa dele mas sim porque, assim como o ``sed``(1) do
Heirloom, ele não implementa a opção de expressões regulares extendidas --- e
acaba por devolver uma linha diferente do que a função ``verpart()`` do *script*
``configure_version.sh`` do perl-cross espera receber --- essa linha que, no
caso, contém a versão do Perl ---, assim falhando em encontrar o *patchset* para
aquela versão em específico dentro do diretório ``cnf/diffs`` e nos dando o
erro "This perl version is probably not supported by perl-cross" ("Essa versão
do Perl provavelmente não é suportada pelo perl-cross"). 
Uma possível solução para isso seria trocar a opção ``-r`` pela ``-E``, que é ao
menos compatível tanto com o ``sed``(1) do lobase quanto com o GNU sed em si. 

***

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--target=$COPA_TARGET \
	--build=$COPA_HOST
```

#### 2º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### Perl

O Perl provê um interpretador para a linguagem de programação de mesmo nome;
será necessário que tenhámos um interpretador da linguagem Perl na toolchain
pois alguns programas --- entre eles, o próprio núcleo Linux --- fazem uso de
*scripts* em Perl em seus sistemas de montagem.  

#### 1º: Aplique os *patches* do pacote perl-cross

O pacote perl-cross, que está no mesmo diretório do Perl em si, contém arquivos
que permitem a compilação cruzada do Perl para nossa toolchain, entre eles um
script ``Configure`` modificado para que não tenhamos que fazer uma grande volta
ao Mundo para configurar o código-fonte.  
Para aplicar é simples: devemos primeiro descompactar o perl-cross no diretório
``cmp/``, como se fosse um pacote comum e, então, copiar seu conteúdo para o
diretório do Perl.  

***
**Nota**: Antes de rodar o trecho de código abaixo, lembre-se de que, assim
como nas outras vezes em que aplicamos *patches*, estou considerando que você
ainda não está dentro do diretório do pacote no qual iremos aplicar os *patches*
em si --- no caso, o Perl. Caso já esteja dentro do diretório do Perl, apenas
mude ``./perl-cross-1.3.5/*`` por ``../perl-cross-1.3.5/*`` e ``./perl-5.32.0/``
por ``.``.

***

```sh
cp -rvf ./perl-cross-1.3.5/* ./perl-5.32.0/
```

#### 2º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--target=$COPA_TARGET
```

#### 3º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### TAR do "Schily" (vulgo star, s-tar ou simplesmente ``tar``(1))

Essa é uma das várias implementações do comando ``tar``(1), bifurcada por
Jörg "Schily" Schilling a partir de uma implementação originalmente publicada no
Grupo de Usuários da Sun [Microsystems] (Sun Users Group) em 1982 e que, por
conta disso, seria a implementação de código-aberto mais antiga do ``tar``(1)
existente[^44] --- por mais que, segundo investigações feitas por Thomas E. Dickey
em seu artigo "*TAR versus Portability*", essa história tenha vários furos.[^45]  
Também é frequentemente dito por Schilling que o s-tar seria a implementação
mais rápida do ``tar``(1) para UNIX[^46]; mas tal afirmação também é questionada
por Dickey em seu artigo, pois Schilling não apresentou nenhuma pegada (*footprint*)
ou *benchmark* provando tal afirmação --- algo que podemos também questionar e
ir atrás posteriormente, não a fim de "crucificar" o Schilling como mentiroso,
mas talvez até para provar a tal afirmação em si.  

Mesmo com essa intriga entre as duas partes, o s-tar é um programa excelente e,
por conta disso, decidi selecioná-lo como implementação padrão do ``tar``(1)
tanto para o sistema-base quanto para essa toolchain.  
Não quero me meter na intriga dos dois, até porque eles que são brancos que se
entendam.

#### 1º: Aplique os *patches*

Esse *patch* faz com que o star seja compilado para o prefixo ``/tools`` ao invés
de ``/opt/schily``, é uma simples alteração no arquivo ``DEFAULTS/Defaults``,
dentro da árvore de código-fonte do star.  
Posteriormente, no sistema-base, teremos outro *patch* --- que, nesse momento
do dia 27 de maio de 2022 eu ainda não fiz --- que vai fazer com que o prefixo
seja o ``/`` e que o binário em si seja linkeditado de forma completamente
estática.  

***
**Nota**: Algo que eu ainda hei de repetir diversas vezes durante esse manual
--- tanto nessa parte da toolchain quanto, principalmente, no sistema-base ---
é de que eu estou considerando que você ainda não esteja dentro do
diretório-alvo do nosso *patch*.  
Nesse caso, apenas mude ``-d ./star-1.6`` por ``-d .``.  
É mais um procedimento padrão que vale a pena se relembrar, pois se você
esquecer disso agora, vai acabar com um ``tar``(1) quebrado que aponta para a
biblioteca C da máquina hospedeira --- no caso do Ubuntu 22.04, que estou
usando, ``/lib64/ld-linux-x86-64.so.2`` --- ao invés da biblioteca C da
toolchain (``/tools/lib/ld-musl-x86_64.so.1``).

***

```sh
patch -p1 -d ./star-1.6/ < \
	"$COPA/usr/src/copacabana/patches/star-1.6/star-1.6_tools.patch"
```

#### 2º: Compile e instale na toolchain

***
**Nota**: Por conta do sistema de montagem próprio do Schilling (e de tal
gambiarra, por assim dizer, para que programas utilizando-o compilem com o
GNU Make ao invés de seu "Schily SunPro Make"), o star toma um tempo
considerável para compilar --- mesmo numa máquina recente com um AMD Ryzen
5 3500U, 12GB de memória RAM e utilizando todos os 8 fios de execução (por
meio da opção ``-j`` de paralelização do GNU Make), ele leva aproximadamente
4min. e 3 seg. para o processo de compilação e linkedição.  
Se você estiver numa máquina menos potente do que essa, possivelmente vai levar
5 ou 6 minutos. Logo, aproveite e passe um café ou um chá --- ou, se não estiver
com muita pressa, saia para caminhar.  

***

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU Texinfo

O GNU Texinfo provê uma ferramenta de análise sintática para uma linguagem de
formatação de texto de mesmo nome.  
Pelos meus testes (e pela lista de dependências do Linux from Scratch 9.0), é
necessária para compilar alguns pacotes, entre eles o FLex --- todavia, acredito
que eu possa estar equivocado, então no futuro talvez a gente consiga deixar o
Texinfo de lado.

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--target=$COPA_TARGET \
	--build=$COPA_HOST
```

#### 2º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### **F**ast **Lex**ical Analyzer Generator (vulgo flex ou simplesmente ``lex``(1))

O flex provê uma ferramenta para análise léxica de arquivos a fim de
convertê-los em código-fonte compilável(? É essa palavra mesmo?) em C ou outra
linguagem suportada. Normalmente é utilizado para criar ferramentas de análise
sintática para linguagens de programação (como o ``bc.y`` do Heirloom Toolchest)
ou para linguagens de formatação de texto.  
É análogo ao GNU m4 e ao GNU Bison nesse sentido, todavia ele não atribui
significado específico a uma expressão dada, "apenas" substitui palavras normais por
palavras-chave (ou "*tokens*") e então, aí sim, o analizador sintático atribui
significado prático à tal expressão.  

#### 1º: Rode o *script* ``configure``

```sh
HELP2MAN=$(which true) \
ac_cv_func_malloc_0_nonnull=yes \
ac_cv_func_realloc_0_nonnull=yes \
./configure --prefix=/tools \
	--host=$COPA_TARGET \
	--build=$COPA_HOST
```

***
**Nota**: Caso você esteja se perguntando sobre o porquê de estarmos forçando o
GNU auto\*conf, ao pré-definirmos as variáveis de cachê (``cv``, *cache
variable* em inglês) ``ac_cv_func_malloc_0_nonnull`` e
``ac_cv_func_realloc_0_nonnull`` como "``yes``"[^47], a utilizar o ``*malloc()``
e o ``*realloc()`` da biblioteca C da toolchain antes dele sequer testar de fato
qual utilizar --- caso nossa toolchain não tivesse, ele utilizaria o
``malloc.c`` e o ``realloc.c`` da Gnulib (ou de uma implementação própria do
pessoal do Flex)[^48] ---, é a fim de corrigir o erro abaixo.

```console
gmake[2]: *** [Makefile:1696: stage1scan.c] Segmentation fault (core dumped)
gmake[2]: Leaving directory '/dsk/0v/usr/src/cmp/flex-2.6.4/src'
gmake[1]: *** [Makefile:546: all] Error 2
gmake[1]: Leaving directory '/dsk/0v/usr/src/cmp/flex-2.6.4/src'
gmake: *** [Makefile:533: all-recursive] Error 1
[baggio@S145 flex-2.6.4]$
```

Esse erro originalmente foi percebido pelos autores e contribuidores do manual
Cross-Compiled Linux from Scratch (que chamarei apenas de "CLFS", por uma
questão de simplicidade) em uma data que não consigo precisar e foi publicado em
26 de Julho de 2009, na edição ``SVN-0.0.1-20090726-x86`` do manual "Sysroot" ---
que corresponderia ao nosso sistema-base.  
No CLFS, o erro é meramente citado como resultado do *script* ``configure``
falhando em configurar os valores corretos, sem muita explicação adicional.[^49]
De fato, é isso que ocorre:  em seus (vários) testes pela presença de uma
implementação do ``*malloc()`` e ``*realloc()`` dentro do cabeçalho ``stdlib.h``,
acabam por algum motivo falhando e, por conta disso, o *script* configura para
que se utilize a implementação "embutida" do flex para as funções ao invés de usar
a nativa da biblioteca C. Isso acaba fazendo com que, por algum motivo que não
consigo explicar direito ainda por falta de conhecimento em C --- o ``stage1flex``
gere uma falha de segmentação quando executado, como se estivesse tentando acessar
um endereço ilegal na memória.  

Eu imagino que essa parte devesse estar na seção de solução de problemas, mas ao
mesmo tempo não vejo necessidade já que estamos previnindo esse erro antes que
sequer ocorra.  

***

#### 2º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### Vi Improved (vulgo Vim ou ``vim``(1))

O Vim é uma reimplementação (com diversas melhorias, tanto é que seu nome é, em
tradução, "Vi Melhorado") do editor vi, esse que surgiu originalmente em 1976 e
foi criado por Bill Joy.  
O Vim foi criado por Brian Moolenar no ano de 1990. Foi originalmente bifurcado
de um clone do vi para computadores Amiga e, posteriormente, foi portado para
UNIX-compatível.  

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/tools \
	--host=$COPA_TARGET \
	--target=$COPA_HOST \
	--without-gui	\
	--without-x
```

#### 2º:  Compile e instale na toolchain

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

## Pré-aquecendo o forno em 180°C: preparando o ambiente de chroot para o sistema-base

Antes de entrarmos em chroot com a Mitzune para compilarmos todo o
resto do sistema, nós precisamos configurar --- ou melhor dizendo,
popular --- o sistema de arquivos para tal.

### Criando a árvore de diretórios

Atualmente, se você seguiu todos os procedimentos anteriores, você
não deve ter nada no seu disco além das toolchains e do ``/usr/src``,
onde as *tarballs* contendo código-fonte estão salvas; logo, não tem
um FHS completo ainda.

Para popular nosso FHS, assim nos permitindo finalizar o sistema,
"entre" dentro do diretório setado em ``$COPA`` (no nosso caso,
``/dsk/0v``) e logado como usuário \```root``', rode o *script*
``cmd/populate_fhs.ksh``.
Esse *script* automaticamente vai gerar toda a estrutura de diretórios
necessária para a compilação do sistema-base.

```sh
cd $COPA
doas ksh $COPA/usr/src/copacabana/cmd/populate_fhs.ksh; echo $?
```

Após a criação dos diretórios, se tudo ocorreu corretamente, o
*script* deve sair com status 0 (você pode checar isso com ``echo $?``,
inclusive recomendo que você sempre cheque após qualquer execução
de *scripts* ou de uma compilação propriamente dita).

### Preparando o Virtual Kernel Filesystem (V.K.F.S)

A maior parte desse processo é, felizmente, feito pela Mitzune,
que no caso seria "bindar" os sistemas de arquivos virtuais do
núcleo Linux (``/proc``, ``/sys``, ``/dev`` et cetera) rodando no sistema
hospedeiro para o nosso chroot do Copacabana; todavia, ainda têm
mais alguns finos ajustes que precisamos fazer antes de bindar
esses diretórios. Esses ajustes são, basicamente, criar arquivos
de (pseudo-)dispositivo para o ``/dev/console`` e para o ``/dev/null``
usando o comando ``mknod``(8) e, em seguida, configurar suas permissões
de escrita e leitura com o comando ``chmod``(1).

```sh
doas mknod $COPA/dev/console c 5 1
doas chmod 600 $COPA/dev/console

doas mknod $COPA/dev/null c 1 3
doas chmod 666 $COPA/dev/null
```

### Importando o prefixo da Mitzune

No usuário no qual você instalou a Mitzune, que deve ser o seu
próprio usuário pessoal, você deverá importar o prefixo do chroot
do Copacabana para a Mitzune.
Essa é, de longe, a parte mais simples do processo.

```console
mitzune -I copacabana.mexp
```

Caso você não tenha montado o disco do Copacabana usando o
L.E.``mount`` ou ele seja um disco secundário (no caso, já havia
um ou outros montados anteriormente), você precisará editar o
arquivo ``chroot.mit`` e trocar o conteúdo da variável ``COPA``.

## Segunda rodada: entrando em chroot

Apenas digite o comando para a Mitzune executar o prefixo do
Copacabana.
Você deverá ser recebido com um belo prompt de comando escrito
``copacabana_chroot%;``.

```console
mitzune -n copacabana -r
```

A partir desse ponto, tudo, absolutamente tudo que for feito aqui
é para ser feito dentro do ambiente de chroot da Mitzune.

### Pegapácapá: criando (outros) arquivos especiais, ligando binários básicos etc

Essa parte é bem chata de se fazer manualmente, mas já que eu já
me dei ao trabalho de fazer isso antes, você possivelmente só vai
precisar copiar e colar --- e em breve talvez ainda menos, estou
planejando criar um sistema de compilação automatizado e
consolidar o processo de compilação.

Primeiramente, por uma questão de compatibilidade dos *scripts* de
configure e com os Makefiles que serão rodados nesse estágio,
precisamos criar alguns *hacks* temporários no sistema de arquivos
para não termos nenhum problema de "``x: command not found``".

Como nosso sistema não vai ter ligações simbólicas em binários e nem
em bibliotecas (apenas em arquivos essenciais como o ``/etc/mtab``,
enquanto não arrumo uma solução melhor), é fácil identificar o que
fora temporário (ou não) no fim da compilação.

```sh
for i in cat dd echo install ksh ln pwd rm sh stty; do
    ln -s /tools/bin/$i /bin/$i
done
```

***
**Uma nota sobre o Perl em específico**: a ideia é que interpretadores,
compiladores e afins fiquem abaixo da estrutura ``/usr/ccs``, logo você
deve lembrar-se de excluir essa ligação ao fim do processo de compilação
e instalação do Perl para o sistema-base --- ou talvez refazer a ligação,
com o binário do Perl indo para o ``/usr/bin``.

***

```sh
ln -s /tools/bin/perl /usr/bin
```

Segundo o Linux From Scratch original, essas bibliotecas do GCC são
necessárias para a compilação do sistema-base pois a biblioteca C GNU
precisaria tanto da ``libstdc++`` para testes quanto da ``libgcc_s``
para ter a pthreads funcional.[^50]
Como estamos usando a biblioteca C musl, acredito que essas bibliotecas
não seriam necessárias para compilar a biblioteca C em si; entretanto,
como esse processo também é descrito "por cima" no livro do Derrick ---
no qual estou me baseando --- estou repetindo-o aqui; em qualquer
momento essa parte pode ser removida caso for provado que essas
bibliotecas não são necessárias para compilar a musl (ou qualquer
outro software subsequente que tivermos nessa etapa).

```sh
for i in libgcc_s.so libgcc_s.so.1 libstdc++.a libstdc++.so \
	libstdc++.so.6; do
    ln -s /tools/lib/$i /usr/lib/$i
done
```

Por uma questão de compatibilidade, faz-se a ligação simbólica do
arquivo ``/proc/self/mounts`` para o ``/etc/mtab``.
O ``/etc/mtab`` existiu no passado a fim de suprir uma necessidade de
UNIXes mais antigos, que era a de poder ler a informação de discos
montados, mas sem ter, exatamente, uma chamada de sistema (no inglês
"*system call*" ou "*syscall*") (ou até mesmo um *pseudo-filesystem*
virtual) para isso. Cada programa que mexesse com discos e afins (ex.:
``df``(1), que lê os discos montados no sistema) deveria, por conta
própria do desenvolvedor, escrever ou ler deste arquivo. Com o advento
do procfs --- que, se não me engano, surgiu no Plan 9 --- a comunicação
de programas/*scripts* da *Userland* com o núcleo ficou mais simplificada
e unificada e, consequentemente, métodos antiquados e complexos começaram
a ser deixados de lado aos poucos --- e um deles é o ``/etc/mtab``.
Como várias aplicações ainda dependem fortemente do ``/etc/mtab`` ---
inclusive algumas do Heirloom Toolchest, ao menos presumo pela idade do
código-fonte em si --- fazemos essa ligação para que essas aplicações
funcionem como esperado.

```sh
ln -s /proc/self/mounts /etc/mtab
```

Para que o usuário \```root``' (e outros posteriores) possam fazer *logon* no
sistema (e para que eles sequer existam), a criação dos arquivos
``/etc/passwd`` e do ``/etc/group`` é necessária, afinal trata-se de uma
base de dados contendo os usuários e grupos no sistema.

```sh
cat > /etc/passwd << "EOF"
root:x:0:0:root:/:/sbin/sh
daemon:x:6:6:daemon:/dev/null:/bin/false
messagebus:x:18:18:dbus:/var/run/dbus:/bin/false
nobody:x:99:99:nobody:/dev/null:/bin/false
EOF
```

```sh
cat > /etc/group << "EOF"
wheel:x:0:
sys:x:2:
kmem:x:3:
tty:x:5:
daemon:x:6:
disk:x:8:
lp:x:9:
dialout:x:10:
audio:x:11:
video:x:12:
utmp:x:13:
usb:x:14:
adm:x:16:
messagebus:x:18:
input:x:24:
mail:x:34:
nogroup:x:99:
users:x:999:
EOF
```

Por último, devemos criar os arquivos de registro que
serão escritos pelo `agetty`, `login` e `init`
posteriormente e então dá-los as permissões corretas.
Isso porque esses programas apenas os escrevem e não
os criam por alguma razão.

```sh
for i in btmp lastlog faillog wtmp; do
    > /var/adm/$i
done

chgrp utmp /var/adm/lastlog
chmod 664 /var/adm/lastlog
chmod 600 /var/adm/btmp
``` 
## Assando o bolo: compilando pacotes do sistema-base

Essa é a parte em que vamos compilar todos os pacotes do sistema-base.
Algo que vale lembrar é que, ao contrário da parte anterior, os pacotes terão
apenas uma descrição fugaz sobre o que são e para o que servem, a fim de evitar
redundância.  
Recomendo que você, já no shell do ambiente da Mitzune, configure a variável
``CFLAGS`` e ``CXXFLAGS`` --- e evite usar configurações muito específicas caso
esteja compilando para outra máquina ou para redistribuir.  

### Configurando as ``CFLAGS``

As ``CFLAGS``/``CXXFLAGS`` que estou utilizando para as *tarballs* oficiais do
Copacabana são essas:  

```sh
# CFLAGS/CXXFLAGS genéricas para programas
# que usem Makefiles ou scripts configure
CFLAGS='-O2 -march=x86-64 -mcpu=znver2 -pipe'
CXXFLAGS="$CFLAGS"
# CFLAGS para o KBuild (núcleo Linux)
KCFLAGS="$CFLAGS"
```

Essa linha de configuração significa o seguinte:

* ``-02``: Nível de otimização médio, pois concilia um tempo relativamente
  pequeno de compilação com a melhor performance dos binários para aquela
arquitetura, sem que se perca estabilidade[^51].  
**Não** é recomendado que se use a opção ``-O3``, a não ser em casos extremamente
específicos onde você tenha certeza absoluta --- por mão dos mantenedores ou por
sua própria --- que o pacote a ser compilado não irá quebrar com esse nível de
otimização. O nível 3, que é basicamente um conjunto das otimizações já presentes
nos níveis 1 e 2, torna-se tão arriscado pois ele contém otimizações adicionais
que podem, de fato, quebrar o binário do programa final dependendo da maneira qual
seu código foi escrito; um exemplo de otimização agressiva que pudesse causar alguma
falha na execução futura do programa são operações de movimentação de código[^52]
(*code motion*, em inglês) que, em resumo, movem ou removem operações em código de
montagem a fim de reduzir redundância de tais e/ou diminuir o tamanho do
binário[^53], pois o compilador fará tais modificações baseadas em
__suposições__ de como tais operações deveriam ocorrer baseando-se na ideia de que
o programa foi escrito seguindo __estritamente__ a especificação de sua linguagem.
Outro ponto a se considerar também é que além de riscos de, em sua execução, o
binário final se demonstrar instável, às vezes as otimizações acabam por atrapalhar
ao invés de ajudar; alguns exemplos disso seriam código de máquina maior e,
consequentemente, binários maiores, com desempenho adicional ignóbil em uma situação
prática, o binário final simplesmente tendo desempenho inferior ao que se teria caso
fosse compilado com otimizações de nível 2 ou até mesmo nível 1, algo que já fora
experienciado (e também explicado) em diversas ocasiões por programadores e
entusiastas pela Internet.[^54][^55]
Sobre as opções de otimização num geral, algo que vale se citar é que qualquer
nível acima do 3 (seja ``-O4``, ``-O5`` ou ``-O$(echo '10^23' | bc)``) não terá
diferença nenhuma, ao menos não no GCC --- e, se não me engano, no LLVM também.  
No caso do GCC, que estamos utilizando, a função ``maybe_default_option()``[^56],
que basicamente serve para determinar o nível de otimização do código a partir da
opção que o usuário passa, prevê que, qualquer opção ``-O`` com um inteiro maior
ou igual do que ``3`` terá o mesmo funcionamento, como pode ser visto no excerto de
código da árvore da versão 10.3.0 do GCC abaixo:  
**Linhas 365 até 367, arquivo ``opts.c``:**
    
    ```c
    case OPT_LEVELS_3_PLUS:
      enabled = (level >= 3);
      break;
    ```

    Ou seja, em suma: qualquer nível acima do 3 continuará a ter as mesmas opções
    habilitadas que o nível 3. “E quem quer todos os níveis, O1, O2, O3, O4 e até
    mais, fica só com O3 só”, em uma rima Jobinesca para resumir mais ainda.
- ``-march=x86-64``: Monta os binários para a arquitetura ``x86-64`` que, nesse
  caso, representa apenas um processador de x86 de 64-bits genérico, assim não
prejudicando a compatibilidade com outras plataformas.[^57] Veja a nota que
coloquei abaixo dessa seção;
- ``-mcpu=znver2``: Optimiza o código para processadores da AMD com
  microarquitetura Zen, versão 2;[^58]
- ``-pipe``: __Teoricamente__ aumenta a velocidade de compilação em máquinas com
armazenamento em discos mecânicos (conhecidos como "HDD" ou simplesmente "HD") ---
ou discos não necessariamente mecânicos, mas com baixa velocidade em operações de
E/S ---, ao utilizar encanamentos (*pipes*, em inglês) ao invés de arquivos
temporários no momento da compilação.[^59] Assim, o compilador não precisaria
"conversar" com (acessar, escrever e então ler) o disco múltiplas vezes, mas sim
apenas passar a informação pelo encanamento para o próximo processo. Isso se mostra
útil, principalmente, em projetos montados com o compilador sendo executado
paralelamente em vários fios de execução (a famigerada opção ``-j`` presente no
Make). A única desvantagem em si é o relativo alto consumo de memória RAM, pois
você terá constantemente dois programas que consomem muita memória sendo
executados simultaneamente de forma direta --- no caso, o compilador (no nosso
caso, o ``gcc``) e o montador (no nosso caso, o ``gas``), que normalmente seriam
executados em forma hierárquica e não-paralela, com o compilador primeiro
compilando o código-fonte para a linguagem de montagem de sua arquitetura
e então chamando o montador para gerar o binário.
Se você tiver menos do que 2GB de memória RAM e não tiver o espaço de troca
habilitado, não é recomendado que se utilize essa opção, pois você corre o risco de
ter o processo morto pelo próprio núcleo Linux (utilizando o mecanismo OOM[^60]) numa
tentativa de impedir que tal utilize toda a memória.

***
**Nota**: Eu não coloquei o ``-march`` como ``znver2`` pois, caso eu tivesse
feito isso, ele iria gerar código de máquina especificamente para processadores
dessa série, e isso poderia fazer com que o Copacabana viesse a rodar com
desempenho abaixo do normal ou ter problemas mais sérios em outros processadores.  
Já, o ``-mcpu`` "apenas" otimiza os binários para a microarquitetura indicada,
mas sem comprometer o funcionamento dele em si.  

***


Outra coisa importante de se citar é que, por padrão, a maioria dos pacotes
compilados para o sistema-base devem ser linkeditados estaticamente. Isso já
foi dissertado e explicado anteriormente. Entretanto, não preocupe-se com
isso: você não vai precisar declarar ``-static`` nas suas
``CFLAGS``/``CXXFLAGS``, pois os *patches* que você vai aplicar durante o
processo ou opções de linha de comando citadas nessa tabula já o farão
para você.

### Cabeçalhos do núcleo Linux

***
**Nota**: Caso você esteja tentando poupar tempo e conveniência
e esteja usando a antiga árvore de código-fonte (que foi usada para o
``cross-tools`` e para o ``tools`` anteriormente), é aconselhado pelo
manual original do Linux from Scratch que você limpe-a usando o
comando ``gmake mrproper``.

***

#### 1º: Aplique o *patch* para que o Linux possa ser compilado em cima da biblioteca C musl

***
**Nota**: Assim como na seção anterior, da toolchain intermediária, eu também
estou considerando que você ainda não está dentro do diretório-alvo do nosso
*patch*.  
Nesse caso, apenas mude ``-d ./linux-5.10.105/`` por ``-d .``.  

***

Esse *patch* faz com que o arquivo ``swab.h`` use o cabeçalho ``stddef.h``
ao invés do ``compiler.h``; isso adiciona uma definição do
``__always_inline``, que é necessária para que o cabeçalho possa ser
compilado fora da biblioteca C do GNU.[^61]

```sh
patch -Np1 -d ./linux-5.10.105/ < \
    /usr/src/copacabana/patches/linux-5.10.105/include-uapi-linux-swab-Fix-potentially-missing-__always_inline.patch
```

#### 2º: Gere os cabeçalhos

```console
gmake headers
```

#### 3º: Instale-os no sistema

Primeiro, copiaremos tudo da árvore de código-fonte do Linux.

```sh
cp -rv usr/include/* /usr/include
```

E, em segundo e por último, limparemos os arquivos
desnecessários no nosso sistema e não na árvore de
código-fonte do Linux em si, pois não queremos a
inconveniência de precisar extrair o código duas vezes.

```sh
find /usr/include \( -name '.*' -o -name '.*.cmd' \) -exec rm -vf {} \;
rm -v /usr/include/Makefile
```

Todavia, mesmo esses arquivos sendo, nesse momento, desnecessários, eles são
extremamente úteis na hora de se compilar o núcleo Linux por completo. O sistema
de compilação do núcleo Linux faz uso dos tais a fim de acelerar a compilação do
núcleo, ao evitar que o GNU Make seja invocado desnecessariamente[^62] --- mas, como
apenas queremos os cabeçalhos, podemos simplesmente apagá-los de nosso
``/usr/include``.

### Biblioteca C musl

#### 1º: Aplique os *patches* necessários para o funcionamento esperado da biblioteca C musl no sistema.

***
**Nota**: Assim como na seção anterior, da toolchain intermediária, eu também
estou considerando que você ainda não está dentro do diretório-alvo do nosso
*patch*.  
Nesse caso, apenas mude ``-d ./musl-1.2.1/`` por ``-d .``.  

***

Este primeiro *patch* é, de longe, o mais simplório, visto que ele
só conserta os caminhos de diretório para o Copacabana.

```sh
patch -Np1 -d ./musl-1.2.1/ < /usr/src/copacabana/patches/musl-1.2.1/fix-paths.patch
```

***
**Nota para compilações futuras**: Por hora, o patch está tecnicamente
"quebrado", em outras palavras, o comando patch vai perguntar a você
exatamente qual arquivo você deseja patchear.  
Neste caso, o arquivo seria o ``include/paths.h``.

***

O ``handle-aux-at_base.patch`` é dito necessário, em uma curta
descrição no cabeçalho[^63], para que o *stub* do interpretador
ELF do gcompat funcione com alguns binários que já foram
comprimidos de alguma maneira (ditos "packed binaries")[^64].  
Todavia, eu gostaria de poder explicar melhor o que esse
*patch* faz posteriormente.

```sh
patch -Np1 -d ./musl-1.2.1/ < /usr/src/copacabana/patches/musl-1.2.1/handle-aux-at_base.patch
```

O ``syscall-cp-epoll.patch``? Bem, infelizmente não achei
nenhuma informação muito profunda sobre o que ele faz
em si e/ou porque devemos aplicá-lo, mas como esta
tabula é aberta, faça um *commit* com o que você descobrir.

```sh
patch -Np1 -d ./musl-1.2.1/ < /usr/src/copacabana/patches/musl-1.2.1/syscall-cp-epoll.patch
```

#### 2º: Rode o *script* ``configure``.

```sh
LDFLAGS="-Wl,-soname,libc.musl-$(uname -m).so.1" \
./configure --prefix=/usr \
	--sysconfdir=/etc \
	--localstatedir=/var \
	--mandir=/usr/share/man \
	--infodir=/usr/share/info \
	--disable-gcc-wrapper
```

#### 3º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) && gmake install
```

Após instalar, vamos primeiro realocar os arquivos no nosso sistema.
Geralmente, bibliotecas dinamicamente linkeditadas (com final ``.so.*``),
ficam na *Systemland* (``/``), enquanto bibliotecas estáticas (com final
``.a``) ficam na *Userland* (``/usr`` para cima).
Isso por uma questão lógica de dependência: imagine, hipoteticamente
falando, que você precise rodar seu sistema sem o ``/usr`` montado por
alguma razão. Você não poderia ter a biblioteca dinamicamente
linkeditada lá, pois quaisquer programas da *Systemland* que dependessem
de tal biblioteca dinamicamente não poderiam rodar.

Primeiro, delete a ligação simbólica antiga do ``/usr/lib/libc.so`` para o
``/lib/ld-musl-$(uname -m).so``:

```sh
rm /lib/ld-musl-$(uname -m).so
```

Depois, mova o ``/usr/lib/libc.so`` para o ``/lib/ld-musl-$(uname -m).so.1``.

```sh
mv /usr/lib/libc.so /lib/ld-musl-$(uname -m).so.1
```

Então, faça uma ligação simbólica entre o arquivo ``/lib/ld-musl-$(uname -m).so.1``
para o ``/usr/lib/libc.so``. Praticamente o que foi feito originalmente, só que
o inverso.  
Essa será uma das poucas ligações simbólicas no sistema-base feita por nossa
conta --- além do ``/etc/mtab`` para o ``/proc/self/mounts`` --- a fim de manter
compatibilidade.

```sh
ln -s /lib/ld-musl-$(uname -m).so.1 /usr/lib/libc.so
```

Também crie essa pequena ligação física de compatibilidade, pois
algumas aplicações talvez esperem um arquivo com nome
``libc.musl-*.so.1`` ao invés de ``ld-musl-*.so.1``.

```sh
ln /lib/ld-musl-$(uname -m).so.1 /lib/libc.musl-$(uname -m).so.1
```

Em seguida crie uma ligação física entre o ``/lib/ld-musl-*.so.1`` e o
``/bin/ldd``.

```sh
ln /lib/ld-musl-$(uname -m).so.1 /bin/ldd
```

O ``ldd``(1) é uma ferramenta que geralmente vem por responsabilidade
(implementação) da biblioteca C que basicamente lista quais são
dinamicamente linkeditadas num binário.  
Na biblioteca C do GNU, é um pequeno *hack* em Shell script, com coisa
de 159 linhas sem comentários; já na musl (que estamos usando) é o
mesmo binário da biblioteca em si. Eu presumo --- isso pois não
li o código-fonte --- que a "mágica" aconteça (ou, em palavras mais técnicas,
os *payloads* do ``ldd`` são ativados) quando o ``argv[0]`` é igual a '``ldd``'.  

Por último, mas longe de ser menos importante, crie os arquivos que
indicam ao linkeditor onde procurar bibliotecas (sim, já mexemos no
binário do linkeditor lá na etapa da toolchain para que ele busque
as bibliotecas nos diretórios ``/lib`` e ``/usr/lib``, todavia é
necessário que indiquemos nesses arquivos também).

```sh
cat > /etc/ld-musl-$(uname -m).path << "EOF"
/lib
/usr/lib
EOF
```

Infelizmente, ao menos pelo que parece no manual oficial da versão 1.0.0 da
biblioteca C musl[^65], nós estamos restritos a utilizar o arquivo
``ld-musl-$(uname -m).path`` para indicar os diretórios contendo bibliotecas
dinâmicas; ao contrário da biblioteca C GNU, onde podemos incluir outros
arquivos de configuração --- como pode ser visto em distribuições como o Ubuntu,
onde o arquivo ``/etc/ld.so.conf`` principal contém apenas uma chamada para a
função ``include`` que, autodescritivamente, inclui os arquivos do diretório
informado, sendo este normalmente o ``/etc/ld.so.conf.d``.

#### 4º: ``libssp_nonshared.a`` (do musl-extra)

Para que não precisemos usar a libssp do GNU (via GCC), vamos
compilar uma versão mínima e estática, a ``libssp_nonshared.a``.

Primeiro, vamos criar o objeto a partir do arquivo ``__stack_chk_fail_local.c``.

```sh
/tools/bin/$(uname -m)-pindoramaCOPACABANA-linux-musl-gcc -fpie -c ./lib/__stack_chk_fail_local.c -o __stack_chk_fail_local.o
```

Depois, vamos empacotar esse objeto numa biblioteca estática,
e então finalmente instalar no sistema com um simples ``cp``(1).

```sh
/tools/bin/$(uname -m)-pindoramaCOPACABANA-linux-musl-gcc-ar r libssp_nonshared.a ./__stack_chk_fail_local.o
cp ./libssp_nonshared.a /usr/lib/
```

### Ajuste na toolchain intermediária antes de continuar

Primeiramente, vamos exportar a variável ``COPA_TARGET`` (a
mesma exportada no .bashrc do usuário no sistema
hospedeiro) dentro da Mitzune.
Isso é necessário para "atalhar" procedimentos que iremos
fazer a seguir, que no caso é substituir o binário do ``ld``(1).

```sh
export COPA_TARGET="$(uname -m)-pindoramaCOPACABANA-linux-musl"
```

Faça backup do binário original do ld, pois caso algo dê
errado no processo de compilação do sistema-base, você
ainda poderia regenerar a toolchain para recomeçar todo
esse capítulo do zero.

A diferença entre o ``ld-old`` e o ``ld-new`` é, explicando
o que fizemos nos passos anteriores da segunda toolchain,
que o ``ld-new`` tem como o ``LIB_PATH`` o ``/lib`` e o
``/usr/lib`` --- em outras palavras, os diretórios do
sistema-base --- enquanto o ``ld-old`` têm os diretórios
das bibliotecas presentes na toolchain.

```sh
mv /tools/bin/ld /tools/bin/ld-old
mv /tools/${COPA_TARGET}/bin/ld /tools/${COPA_TARGET}/bin/ld-old
```

Agora substitua o binário ``ld`` com o binário ``ld-new``.

```sh
mv /tools/bin/ld-new /tools/bin/ld
ln -s /tools/bin/ld /tools/${COPA_TARGET}/bin/ld
```

Depois desse processo com o linkeditor, devemos agora
ajustar o compilador para usá-lo como configurado ---
no caso do GCC, refazer o arquivo specs.

O arquivo specs é como se fosse um "mapa" que o compilador usa
para se guiar na hora de compilar e linkeditar binários.  
Pense no ``gcc``(1) (o binário que invoca o compilador, não
no pacote GCC como um inteiro) como um motorista de
um carro, nos binários subjacentes (``cc1``, ``cc1plus`` etc)
como partes da interface deste carro, o que corresponderia
ao volante, pedais de freio, aceleração e embreagem etc, e
e no arquivo ``spec`` como um mapa, com informações adicionais
ao que o nosso motorista já conhece. Esse nosso mapa conteria
novas informações sobre os limites de velocidade de
determinadas partes do trajeto, atalhos para "cortar"
pedágio em alguma rodovia específica, onde tomar cuidado
por uma maior incidência de animais silvestres andando pelo
meio da estrada, onde o tráfego tende a ser menos (ou mais)
congestionado etc. Essas informações fazem o processo do
nosso motorista de "ir e vir" algo possível dependendo do
tipo de trajeto.

E o arquivo specs faz basicamente isso: ele diz ao ``gcc``
quais programas invocar e caminhos para bibliotecas e cabeçalhos
"seguir" para compilar um programa em C ou C++ além do que
já foi configurado por padrão no GCC[^66] (agora não consigo
precisar se foi algo codificado rigidamente ou configurado
na compilação, pois não fiz nenhum *hacking* no código do
GCC ainda, apenas li parte de sua documentação e *vários*
arquivos de registro).
E, para que o GCC consiga "dançar de acordo com a música" do
linkeditor que acabamos de (re)ajustar, precisamos regenerar
o arquivo specs, com os novos caminhos de bibliotecas e
cabeçalhos.

Primeiramente, vamos configurar duas variáveis por *subshell*:
uma contendo o caminho da libgcc e outra contendo o caminho
final do nosso arquivo specs.

```sh
LIBGCC_PATH=$(dirname $(gcc -print-libgcc-file-name))
SPECFILE="$LIBGCC_PATH/specs"
```

Agora vamos gerar o nosso novo arquivo specs.

```console
gcc -dumpspecs | sed -e 's@/tools@@g'                   \
    -e '/\*startfile_prefix_spec:/{n;s@.*@/usr/lib/ @}' \
    -e '/\*cpp:/{n;s@$@ -isystem /usr/include@}' > specs.tmp
```

Acima temos um encanamento ligando entrada e saída, onde a entrada
é o comando --- no caso, a saída dele --- ``gcc`` com a opção ``-dumpspecs``
que, como você deve estar imaginando, exporta as specs padrões do GCC que
compilamos anteriormente, passa por uma linha de comando do sed (a qual irei
explicar daqui há pouco) e termina com a saída indo para o um  ``specs.tmp ``.
Se está se perguntando “Por que não salvamos direto como o ``$SPECFILE``
direto?”, isso será respondido no passo seguinte.  
Essa linha de comando do sed faz o seguinte:

* ``s@/tools@@g``: Remove todas as menções ao ``/tools``, no caso trocando
por nada usando o comando de substituição;
* ``/\*startfile_prefix_spec:/{n;s@.*@/usr/lib/ @}``: Busca pelo padrão
"``*startfile_prefix_spec:``", então substitui tudo (``.*``) abaixo dele
("``n``" seria a quebra de linha, análogo ao  ``\n``) por outro padrão
(``/usr/lib``) uma vez que o tal padrão dito é encontrado (note que não há o
"``g``" ao fim, que indica que a mudança não deve ser global);
* ``/\*cpp:/{n;s@$@ -isystem /usr/include@}``: Faz, assim como a linha acima, uma busca
por padrão (este sendo o "``*cpp:``" no caso) e então substitui o fim da linha
(``$``) abaixo desse padrão (de novo há a quebra de linha usando ``n``) por
um novo padrão (``-isystem /usr/include``) uma única vez também (note,
novamente, que não há a indicação de que deva ser uma mudança global).

***
**Nota**: Caso queira estudar mais sobre sed para entender comandos, ao menos de
forma básica, boas referências são o "THE SED FAQ" do Eric Pement[^67] e o
artigo "Using the sed Editor" do Emmett Dulaney[^68].

***

Agora vem a resposta para a pergunta que você possivelmente se fez no último passo.
Nós não salvamos o arquivo direto no ``$SPECFILE`` pois antes precisaríamos checar se
o arquivo foi de fato modificado como queríamos.  
Para isso, use o comando abaixo, que é um simples *hack* em (n)awk que busca por um
padrão e se encontrado imprime o padrão e mais duas linhas abaixo.

```sh
for i in 'cpp' 'startfile_prefix_spec'; do
    nawk -vpattern="$i" \
        '$0 ~ pattern {
        print $0;
        for (i=1; i<=2; i++) {
            getline; print $0
        }
    }' specs.tmp
done
```

Se o comando resultou na saída abaixo, estamos no caminho certo:

```
*cpp:
%{posix:-D_POSIX_SOURCE} %{pthread:-D_REENTRANT} -isystem /usr/include

*startfile_prefix_spec:
/usr/lib
```

***
**Nota**: se algo além do ``*cpp`` aparecer antes do ``*startfile_prefix_spec``,
não se preocupe, pois isso é normal nesse caso já que eu não programei o AWK
para procurar pelo padrão exato.

***

Agora você pode copiar o nosso novo arquivo specs para o ``$SPECFILE``.

```sh
cp -v specs.tmp "$SPECFILE"
```

Se a saída do ``cp``(1) for semelhante a essa abaixo (possivelmente apenas
com a arquitetura diferindo), nós conseguimos.

```console
specs.tmp -> /tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.2.0/specs
```

#### Prova-real dos ajustes

Para finalizar os ajustes, devemos criar uma prova-real do que foi feito.
Não é algo estritamente obrigatório para que tudo funcione, todavia é
bom que se faça para ter uma noção de que tudo está nos conformes.
Você talvez pode não querer fazer isso, mas saiba que aí estaria
assumindo o risco de ter ajustado a toolchain de forma errada.

Para começar, vamos criar um arquivo com código em C contendo um mero
clone do comando ``true``(1), afinal é só para testar se tudo compila e
linkedita nos conformes.

```sh
printf 'int main(void) {\n  return 0;\n}\n' > true.c
```

O nosso clone do comando ``true``(1) formatado:

```console
cat true.c
```  
```c
int main(void) {
  return 0;
}
```

Então vamos compilá-lo, com a opção de verbose tanto para o compilador
(``-v``) quanto para o linkeditor em si (``-Wl,--verbose``).

```console
gcc -o true true.c -v -Wl,--verbose > sanity.log 2>&1
```

***
**Nota**: Sempre que você quiser passar alguma opção para o linkeditor em si,
você irá usar a opção ``-Wl`` seguida por uma vírgula e as opções que você
deseja usar.[^69]

***

Agora, com o binário em mãos, vamos tirar a prova-real de fato.
O comando abaixo lista as propriedades do binário que acabamos de criar
enquanto ELF, mas não precisamos de muitas informações além do interpretador (no
caso, do carregador de bibliotecas dinâmicas, o ``ldd``) "chamado", então
jogamos a saída do comando ``readelf`` num encanamento para o ``grep``.

```sh
readelf -l ./true | grep 'Requesting program interpreter'
```

Se a saída for o nome do arquivo da nossa biblioteca C no sistema (no meu caso,
em uma máquina x86 de 64 bits, ``/lib64/ld-musl-x86_64.so.1``), a princípio está
tudo certo na linkedição, mas caso contrário você deve refazer o reajuste (e se
os próximos testes falharem, também refaça os ajustes).

Continuando nos testes com bibliotecas, devemos checar se os objetos C.R.T.
(acrônimo de "C RunTime", o que hoje em dia não se aplica mais pois várias
linguagens além da linguagem C usam esses objetos na linkedição, ao menos no
caso do GCC e do LLVM) estão sendo linkeditados corretamente.
Esses objetos são usados no processo de linkedição de forma ligeiramente
discreta, mas são estritamente necessários para o funcionamento do binário final
pois são como uma "cola" entre o sistema e o binário.[^70]  
Para você ter uma noção mais ampla: esse objeto contém código em Assembly que
chama a função ``main()``, em outras palavras: não é a função ``main()`` que
inicia o programa (ao menos a baixo-nível, obviamente), mas sim a função
``_start`` dentro desse objeto.[^71]  
Obviamente não é mágica pura, como eu disse, é "apenas" um pequeno trecho de
código que inicia de fato o código final --- você possivelmente vai conseguir
informação mais a fundo acerca deste assunto em livros sobre programação em
sistemas UNIX e/ou sobre programação de médio/baixo-nível.  

Enfim, sem mais delongas, vamos rodar o ``grep``(1) novamente no ``sanity.log``,
dessa vez buscando por tentativas de abrir os arquivos ``crt1.o``, ``crti.o`` e
``crtn.o`` com êxito.

```sh
grep 'attempt to open /usr/lib.*/crt[1in].*succeeded' sanity.log
```

A saída deve ser essa:
```
attempt to open /usr/lib/../lib/crt1.o succeeded
attempt to open /usr/lib/../lib/crti.o succeeded
attempt to open /usr/lib/../lib/crtn.o succeeded
```

Se nada aparecer e/ou o status de saída do grep for diferente de 0, então de duas uma:
ou o compilador e o linkeditor estão linkeditando os arquivos C.R.T. da toolchain
(``/tools/lib`` ao invés de ``/usr/lib``) ou eles não estão sendo encontrados --- e,
nesse caso, você abre mais duas possibilidades: ou você não fez as ligações simbólicas
temporárias entre a toolchain e o nosso sistema ou ele está buscando nos caminhos errados,
no último caso refaça os ajustes.

Finalizando testes relacionados ao processo de linkedição --- mais especificamente ao
linkeditor em si ---, verifique se o linkeditor está procurando pelas bibliotecas nos
diretórios (``SEARCH_DIR``) corretos.
```sh
grep 'SEARCH_DIR.*' sanity.log | sed 's/[[:space:]]/\n/g'
```

O esperado é que a saída seja essa:
```
SEARCH_DIR("=/tools/x86_64-pindoramaCOPACABANA-linux-musl/lib64");
SEARCH_DIR("/lib");
SEARCH_DIR("/usr/lib");
SEARCH_DIR("=/tools/x86_64-pindoramaCOPACABANA-linux-musl/lib");
```

... De novo, vale lembrar que esse exemplo é com uma máquina de 64 bits x86.
Caso a saída não seja essa, você deve recorrer à sessão de solução de problemas
desta tabula, que listará possibilidades de como corrigir esse erro.

Por último, cheque se o pré-processador --- que é parte do GCC e também usa o
arquivo specs como "mapa" --- está procurando pelos cabeçalhos (inclusos
pela diretiva ``#include``) nos diretórios corretos.  

```sh
nawk -vpattern="#include <...> search starts here:" \
    '$0 ~ pattern { print $0; getline; print $0; }' sanity.log
```
O esperado é que a saída seja essa:
```console
#include <...> search starts here:
 /usr/include
```

Se foi isso, o nosso ajuste foi feito corretamente e podemos continuar
tranquilamente.

### musl-extras

O musl-extras contém algumas ferramentas que são necessárias para o
sistema-base, como o ``getconf``(1).  

#### 1º: Compile e instale no sistema

Para compilar todos os binários --- com exceção ao ``ldconfig``, que aqui é um
*script* shell ---, estaremos utilizando apenas um laço de repetição \```for``' e
então instalando-os utilizando a ferramenta ``install``(1), que já utilizamos
antes inclusive.

```sh
for cmd in cmd/*.c; do
	cmd_binary_name="$(basename $cmd .c)"
	gcc -static "$cmd" -o "$cmd_binary_name" \
	&& install -m755 "$cmd_binary_name" /usr/bin \
	&& rm -v "$cmd_binary_name"
done \
&& install -m755 cmd/ldconfig /sbin
```

***
**Nota para compilações futuras**: Eu deveria escrever um Makefile para tudo,
assim não teríamos o trabalho de compilar e instalar no sistema-base
manualmente.   

***

### Korn Shell

O Korn Shell será o shell que utilizaremos para a interação com o usuário no
sistema-base e, também, será utilizado para programação mais complexa em shell
script.  
Estaremos compilando-o antes do musl-compat pois o *script* ``do_install.ksh``
depende do Korn Shell 93 --- ou do GNU Bourne-Again Shell, ou do Z-Shell ---
para ser executado.  
Algo que vale lembrar é que os shells, em particular, não estão sendo
linkeditados estaticamente --- com uma única exceção para o Almquist shell que
iremos compilar especialmente para o ``/sbin`` e que será utilizado apenas pelo
usuário \```root``' em paralelo ao comum presente no ``/bin``. Mas enfim, isso é
para depois.  

#### 1º: Compile e instale no sistema

O Korn Shell usa um sistema de montagem próprio da AT&T, que é um *script* shell
chamado ``package``, que age inicialmente compilando um comando Make próprio ---
chamado internamente de "``mamake``", que significa "Make abstract machine Make"
---, que age numa tentativa de cobrir qualquer possível incompatibilidade que o
comando Make nativo da máquina venha a ter, que então executa diversos testes
para confirmar se bibliotecas e cabeçalhos estão mesmo presentes no sistema e,
por fim, compila o binário principal do Korn Shell.  

Mesmo com toda essa "dança de cavalheiros" ocorrendo, esse sistema de montagem
consegue, ao menos em minha máquina, ser consideravelmente mais rápido que o do
Schilling --- e, se pá, até mesmo que o do próprio GNU auto\*tools em si ---,
mesmo sem paralelização. Eu presumo que seja porque, ao invés de usar diversos 
*scripts* shell ou Makefiles que se "chamam" recursivamente, o sistema de montagem
da AT&T usa pequenos programas na linguagem C e executa suas tarefas de forma
direta.  

Sem mais delongas, execute o comando abaixo. 

```sh
bin/package make
```

Por fim, ao invés de instalarmos os binários por meio do *script*
``bin/package``, nós apenas instalamos manualmente.

```sh
install -m755 arch/$(bin/package host type)/bin/ksh /bin/ksh \
&& install -m444 src/cmd/ksh93/sh.1 /usr/share/man/man1/ksh.1
```

### musl-compat

Esse pacote provê cabeçalhos de compatibilidade para a biblioteca C musl, apenas
no caso de você precisar (ou simplesmente querer) compilar um programa em C
legado.  

#### 1º: Instale no sistema

Como eu disse anteriormente, o processo de instalação é guiado apenas por um
*script* em Korn Shell.  

***
**Nota para compilações futuras**: Talvez, nesse caso, seja mais interessante se
ter um Makefile do que um *script* em Korn Shell. Não que, no Copacabana, vamos
tirar o Korn Shell do sistema-base, mas sim para fins de praticidade.

***

Logo, apenas execute esse comando abaixo:

```sh
./do_install.ksh
```

***
**Nota**: Esse *script*, por hora, ainda não escreve texto (no caso, registro
e afins) para a saída padrão. Então, por mais que pareça que nada aconteceu,
os cabeçalhos foram sim instalados.

***

### Skalibs

O Skalibs provê bibliotecas e cabeçalhos para programação na linguagem C, com
alternativas mais seguras às funções já presentes na biblioteca padrão C,
funções para lidar com estruturas de dados e para gerar números aleatórios de
forma segura.[^72] Ela é particularmente útil para quem quiser fazer um programa
em C, mas no caso estaremos utilizando-a para montar o utmps e o NSSS, que são
programas criados dentro do projeto Skarnet e, portanto, requerem que as Skalibs
estejam presentes no sistema até o estágio de linkedição.[^73]  
Por mais que essas bibliotecas sejam extremamente úteis, creio que apenas o
utmps e o NSSS irão utilizá-las por enquanto, logo nós não iremos instalá-las de
forma fixa no sistema-base, mas sim de forma temporária, apenas para a linkedição
estática.  
Logo após, nós também iremos criar um "mapa" dos arquivos, o que vai ser útil
para quando tivermos que apagar os arquivos do pacote posteriormente.

#### 1º: Rode o *script* ``configure``

```sh
./configure --disable-shared \
	--enable-static \
	--libdir=/usr/lib
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) && gmake install \
&& mkdir /tmp/skalibs-2.11.1.0_lib \
&& gmake install DESTDIR=/tmp/skalibs-2.11.1.0_lib \
&& (cd /tmp/skalibs-2.11.1.0_lib; find . -type f -print) > \
	/usr/src/cmp/skalibs-2.11.1.0.map \
&& rm -rvf /tmp/skalibs-2.11.1.0_lib
``` 

### NSSS (do Skarnet)

O NSSS é uma implementação alternativa do Comutador de Serviço de Nomes (*Name
Service Switch*, ou NSS) presente na biblioteca C GNU.  
Basicamente, quebrando esse "jargão" em partes, é basicamente um conjunto de
bibliotecas que provém funções para acessar, de forma mais "universal", digamos
informações de usuários no sistema.[^74]  
O NSSS foi criado a fim de ser uma implementação do NSS para bibliotecas C que
não tivessem uma implementação da mesma, como a biblioteca C musl por exemplo.
Entretanto, não se trata de um mero *port* da implementação do GNU para outras
bibliotecas C, mas sim uma reimplementação completa que, inclusive, conserta
falhas estruturais originalmente presentes na implementação da biblioteca C
GNU[^75]. Por essas razões, estaremos utilizando-o no sistema-base.

#### 1º: Rode o *script* ``configure``

```sh
./configure	--enable-shared	\
	--enable-static	\
	--enable-allstatic	\
	--prefix=/usr	\
	--libdir=/usr/lib	\
	--with-dynlib=/lib	\
	--libexecdir=/lib/nsss
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### utmps (do Skarnet)

O utmps provê funções para lidar com os arquivos de banco de dados ``utmp`` e
``wtmp``, que guardam registro de usuários presentes no sistema no momento e
de todos os usuários que já entraram e sairam do sistema, respectivamente.[^76]  
Geralmente, essas funções seriam implementadas diretamente na biblioteca C do
sistema, entretanto os desenvolvedores da musl decidiram por não implementá-la
por razões de segurança, o que é abordado de forma específica em seu Q.F.P., na
pergunta "Por que a funcionalidade do utmp/wtmp é implementada apenas como um
rascunho?".[^77] Entre as razões estaria o fato de que, se houvesse uma
implementação completa, a equipe da musl teria trabalho dobrado em fazer algo
que não comprometesse a segurança dos usuários do sistema e de que para
se acessar e modificar o banco de dados do utmp/wtmp precisaria-se que os binários
que o fizessem tivessem permissões de superusuário, o que poderia, potencialmente,
abrir buracos de segurança. Com o propósito de se criar uma implementação segura e
independente da biblioteca C, surgiu o utmps por mão do projeto Skarnet. Essa
implementação se torna mais segura pois os únicos binários que precisam, de
fato, acessar o banco de dados são as *daemons* do utmps --- ``utmps-utmpd`` e
``utmps-wtmpd``, respectivamente --- e os programas que precisam acessá-lo na
realidade estarão fazendo requisições para as *daemons* por meio da
libutmps.[^78] Essa solução, apesar de simples e aparentemente "antiquada", é
genial e funciona bem --- até melhor, pelo ponto de vista de segurança
arquitetural, do que o que fora implementado por UNIXes proprietários e pela
própria Bell Labs durante o arco dos anos 1970 e 2000.  

Algo que possivelmente você não está se perguntando, mas que talvez seja
interessante, é a etimologia dos termos em si. Primeiramente (e, se pá, o mais
simples de se deduzir), o "``u``" em "``utmp``" se referiria aos usuários
("_**u**sers_") atualmente presentes ("logados") no sistema e o "``w``" em "``wtmp``"
se referiria a quem ("_**w**ho_") já esteve presente no sistema; ambos também contém
"tmp" em seus nomes pois, originalmente no UNIX v4, esses arquivos não estariam
localizados no diretório com arquivos contendo informações variáveis sobre a administração
do sistema (``/var/adm``), que nem sequer existia ainda, mas sim no diretório temporário
(``/tmp``).[^79] Logo, "``utmp``" seria "o arquivo de todos os usuários presentes no sistema"
e "``wtmp``" seria "o arquivo de todos os usuários que já estiveram presentes no sistema em
algum momento" --- abrindo uma pequena tangente, o "``tmp``", mesmo dando a ideia de que o
arquivo seria temporário e que seria removido na próxima reinicialização do sistema, como
aconteceria em um sistema UNIX-compatível atual com um diretório temporário cujo
sistema de arquivos ficaria hospedado na memória RAM, ele não seria exatamente
temporário, pois não seria apagado/limpo em cada reinicialização; logo o
"``tmp``" indicaria apenas que ele estaria presente no diretório temporário.

#### 1º: Rode o *script* ``configure`` 

```sh
./configure --enable-shared  \
	--enable-static      \
	--enable-allstatic   \
	--enable-static-libc \
	--libdir=/usr/lib    \
	--with-dynlib=/lib   \
	--libexecdir=/lib/utmps \
	--enable-nsss
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
``` 

Por fim, gere o arquivo contendo metadados da biblioteca para o ``pkg-config``. 

```sh
mkdir /usr/lib/pkgconfig \
&& sed 's/@@VERSION@@/0.1.1.0/; /#/d' > /usr/lib/pkgconfig/utmps.pc << "EOF"
Name: utmps
Description: A secure implementation of the utmp mechanism.
URL: https://skarnet.org/software/utmps/
Version: @@VERSION@@
# Como a utmps foi linkeditada estaticamente nas skalibs, nós não precisamos
# citar as skalibs como dependências da utmps, logo podemos, simplesmente,
# remover sua menção desse arquivo.
# Requires.private: skalibs
Libs: -lutmps
Cflags: -I/usr/include/utmps
EOF
```

***
**Nota**: Esse arquivo (e similares providos por outras bibliotecas atualmente)
acaba por ser uma mão-na-roda na hora de compilar um programa ---
principalmente num sistema de montagem atual, como o CMake --- pois são um
conjunto de informações sobre a biblioteca, contendo sua versão, seu nome para o
linkeditor e o caminho estático de seus arquivos de cabeçalho.[^80] O ``pkg-config``,
enquanto programa, fará o trabalho de informar corretamente se a biblioteca está
na versão necessária, se há alguma exceção de configuração (por meio da ``Cflags``)
para se compilar um programa com ela e qual a localização exata de seus arquivos
--- tanto de cabeçalho, que serão literalmente inclusos no binário final pelo
pré-processador e informados na diretiva ``#include``, quanto seus arquivos de objeto,
que serão inclusos no binário do programa final (de forma dinâmica ou estática) pelo
linkeditor.

***

### Removendo os arquivos das Skalibs

Como dito anteriormente, agora que o NSSS e o utmps foram compilados e
linkeditados estaticamente, não precisamos mais das Skalibs no sistema.  
Logo, estaremos removendo os arquivos de forma segura com a sequência de
comandos abaixo:

```sh
cat /usr/src/cmp/skalibs-2.11.1.0.map | (cd /; xargs rm -vf) \
&& rmdir /usr/lib/skalibs/{sysdeps,} /usr/include/skalibs
```

### Banco de dados de Fuso horário (vulgo tzdb ou zoneinfo) 

Esse pacote é auto-descritivo: ele contém o banco de dados de Fuso horário.  
No livro original do Linux from Scratch, por alguma razão, ele é instalado
literalmente junto da biblioteca C GNU, entretanto ele não nos dá um motivo
explícito do porquê, apenas coloca na mesma categoria de "Configurando a
Glibc".[^81]

#### 1º: Extraindo as *tarballs* num diretório dedicado

Pelo o que fizemos até agora, você deve estar com o hábito quase automático de
desempacotar tudo diretamente no diretório de compilação, o ``/usr/src/cmp``,
pois as *tarballs* que estávamos desempacotando eram arquivos de um diretório,
não uma literal junção dos arquivos. Uma das poucas, se pá a única, exceção a
isso é o Banco de dados de fuso horário ("*Time Zone Database*", em seu nome
original); ao contrário dos pacotes anteriormente vistos, ele não empacota os
arquivos dentro de um diretório, mas sim de forma avulsa. Então, quando você
desempacotar os pacotes como de costume no seu diretório de montagem, irá acabar
com todos os arquivos misturados, o que não é exatamente um problema (a partir
do momento que o Makefile monta o programa de qualquer forma), mas vai fazer uma
bagunça indesejável.  
Para desempacotar da maneira correta, rode o comando abaixo, que irá criar um
diretório chamado ``tzdb2021e`` e extrair as *tarballs* contendo código-fonte
dos programas e a base de dados com os fusos horários para tal.

```sh
mkdir tzdb2021e \
&& for i in tz{data,code}2021e.tar.gz; do
	gzip -cd /usr/src/pkgs/$i | tar -xvf - -C ./tzdb2021e
done
```

Após isso, apenas entre no diretório ``tzdb2021e``, como você faria normalmente
caso o diretório tivesse sido extraído de uma *tarball*.

#### 2º: Compile e instale na toolchain

```sh
zoneinfo='/usr/share/lib/zoneinfo'
export zoneinfo \
&& gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	TZDIR="$zoneinfo" KSHELL='/bin/ksh'
```

Segundo o ``APKBUILD`` do Alpine Linux, mais especificamente no *commit*
``f67da5868d0420d8d466dffbc3655ce1239a1f3b`` feito por Sören Tempel em 03 de
Outubro de 2015[^82], devemos instalar tanto os binários quanto a base de dados
manualmente pois o Makefile estaria "quebrado", e com o adendo de que outras
distribuições Linux já estariam fazendo isso.  
Entretanto, mesmo buscando menções a essa tal falha no alvo ``install`` do
Makefile na Internet, eu não consegui achar nada muito promissor acerca da
motivação original.  
Sem mais delongas, execute os comandos abaixo para instalar e gerar os
fusos-horários.

```sh
timezones="africa antarctica asia australasia europe northamerica \
	southamerica etcetera backward factory"

mkdir -p "$zoneinfo/"{,posix,right} \
&& for tab in iso3166.tab zone.tab zone1970.tab; do
	install -m444 "$tab" "$zoneinfo"
done \
&& for bincmd in tzselect zdump zic; do
	install -m775 "$bincmd" /usr/sbin
done \
&& install -m644 libtz.a /usr/lib \
&& for manpage in newctime.3 newtzset.3 tzfile.5 tzselect.8 zdump.8 zic.8; do
	test -d "/usr/share/man/man${manpage##*.}" \
		|| mkdir "/usr/share/man/man${manpage##*.}"
	install -m644 ${manpage} /usr/share/man/man${manpage##*.}/.
done \
&& zic -b fat -d "$zoneinfo" $timezones \
&& zic -b fat -d "$zoneinfo/posix" $timezones \
&& zic -b fat -d "$zoneinfo/right" -L leapseconds $timezones \
&& zic -d "$zoneinfo" -p America/New_York
```

Esses comandos com a ferramenta zic fazem o seguinte:

* ``-d [...]``: Simplesmente informa o diretório onde o zic deve gerar e
  instalar o banco de dados ao invés de seguir o padrão;
* ``-b fat``: Faz com que os arquivos finais do banco de dados sejam maiores,
  mas compatíveis com programas mais antigos, que possivelmente não lidam bem
com apenas os dados de 64-bits do banco de dados. Talvez isso não seja mais
necessário em versões futuras do Copacabana, mas nunca se sabe;
* ``-L leapseconds``: Essa opção, acompanhada da ``-d`` e de ``$timezones`` ao
  fim do comando, gerará as datas corretas, inclusive com os seus segundos
intercalares --- em inglês, "*leap seconds*", daí o nome da opção e do arquivo
contendo a lista de segundos bissexstos ---, que, em um grandissíssimo resumo, é
uma correção feita na contagem de tempo global a fim de corrigir uma pequena falha
na rotação da Terra em relação ao tempo teórico calculado por físicos.[^83] É um
assunto complexo que nem eu entendo direito, para ser sincero, então pretendo
não me extender nisso.
* ``-p America/New_York``: Quando apenas acompanhado da opção ``-d``, faz com
  que o zic crie o arquivo ``/usr/share/lib/zoneinfo/posixrules``, que na
prática é uma ligação simbólica para o fuso-horário indicado. Isso pode ser
comprovado nos excertos de código-fonte da função ``main()`` do arquivo
``zic.c`` abaixo:  
    **Linhas 796 até 804, do arquivo ``zic.c``:**

    ```c
    			case 'p':
    				if (psxrules == NULL)
    					psxrules = optarg;
    				else {
    					fprintf(stderr,
    _("%s: More than one -p option specified\n"),
    						progname);
    					return EXIT_FAILURE;
    				}
    				break;
    ```

    **Linhas 902 até 905, do arquivo ``zic.c``:**

    ```c
    if (psxrules != NULL) {
    		eat(_("command line"), 1);
    		dolink(psxrules, TZDEFRULES, true);
    	}
    ```
    Entretanto, essa opção é considerada obsoleta pela própria página de manual
    do zic, logo talvez ela seja removida futuramente.  
    Estaremos utilizando o fuso horário para Nova Iorque pois o padrão POSIX
    requer que as "regras" de fuso horário estejam de acordo com as regras dos
    Estados Unidos da América --- algo para qual, infelizmente, não achei uma
    fonte até o presente momento.

Esse (relativamente) grande bloco de comandos é, praticamente, o que o Makefile
faria e deve ser o suficiente para instalar todo o banco de dados.

### Sortix libz (bifurcação da zlib)
 
A libz do Sortix é uma bifurcação da biblioteca de compressão zlib.  
Estaremos compilando-a agora pois, além de ser dependência de tempo de
compilação e de execução de alguns pacotes essenciais que virão a seguir,
como as GNU Binutils, o File e afins. No caso do Heirloom, por este ser
linkeditado estaticamente, a libz será necessária apenas para o estágio de
compilação, mas isso acaba mais por ser uma nota de rodapé.

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/usr \
	--enable-static \
	--enable-shared
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	install-static libdir=/usr/lib \
&& gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	install-shared libdir=/lib \
&& ln -s /lib/libz.so.?.?.? /usr/lib/libz.so
```

### libbz2 (do bzip2)

A libbz2 provê funções para compressão e decompressão de arquivos no formato do
bzip2.  
Estaremos compilando a biblioteca do bzip2 antes das ferramentas em si pois nós
queremos poder usar o suporte à libbz2 no Heirloom --- além de também ser
dependência do File enquanto biblioteca dinâmica.

#### 1º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) -f Makefile-libbz2_so \
	&& gmake -j$(grep -c 'processor' /proc/cpuinfo) -f Makefile libbz2.a \
	&& ranlib libbz2.a \
&& install -m644 libbz2.so.* /lib \
&& ln -s /lib/libbz2.so.?.?.? /usr/lib/libbz2.so \
&& install -m644 bzlib.h /usr/include \
&& install -m644 libbz2.a /usr/lib
```

### File

Essa é uma (das várias) implementações do comando ``file``(1), utilizado para
identificar arquivos e dependência do GNU auto\*conf.

#### 1º: Rode o *script* ``configure``

```sh
./configure --prefix=/usr
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU m4

Essa é a implementação do Projeto GNU do processador de macros m4, utilizada
pelo GNU auto\*conf.

#### 1º: Rode o *script* ``configure``

```sh
ac_cv_lib_error_at_line=no \
ac_cv_header_sys_cdefs_h=no \
./configure --prefix=/usr/ccs
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### bc e dc (do yzena.com)

Essa é a implementação das calculadora dc ("*desk calculator*", ou, em tradução
literal, "calculadora de mesa") e da calculadora bc ("*basic calculator*", ou,
em tradução literal, "calculadora básica").  

#### 1º: Rode o *script* ``configure``

```sh
CC=gcc LDFLAGS='-static' ./configure --prefix=/usr -O3
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo) \
	&& gmake install
```

### GNU Binary Utilities (Binutils)

Esse pacote contém diversas ferramentas para manusear binários, entre elas, como
citei anteriormente, o linkeditor.

#### 1º: Rode o *script* ``configure``

```sh
./configure \
	--prefix=/usr/ccs \
	--enable-ld \
	--enable-gold=default \
	--enable-64-bit-bfd \
	--enable-relro \
	--enable-lto \
	--enable-threads \
	--enable-deterministic-archives \
	--enable-default-execstack=no \
	--enable-targets=x86_64-pep \
	--enable-default-hash-style=sysv \
	--disable-multilib \
	--disable-gprofng \
	--disable-werror \
	--disable-nls \
	--with-mmap \
	--with-system-zlib
```

#### 2º: Compile e instale no sistema

```sh
gmake -j$(grep -c 'processor' /proc/cpuinfo)
```

Após compilarmos a parte principal do pacote, segundo o Musl-LFS, nós deveríamos
compilar as bibliotecas libbfd, libiberty, libopcodes utilizando a opção
``-fPIC`` nas ``CFLAGS``. Isso foi posto no Musl-LFS no dia 23 de Agosto de
2020 pelo Derrick (``dslm4515``), no *commit*
``5ee55e85ecfba776951ba8d0904d49577a56e3c9``, cuja descrição é "Atualizadas as
binutils para [a versão] 2.35 com proteção do Void Linux."[^84]; entretanto, como
indicado, originalmente surgiu no Void Linux, mais especificamente em 12 de
Junho de 2012, tendo sido implementado pelo Juan RP (``xtraeme``) no *commit*
``eb68f14525fe488bc769f2229e82d111ae3c309d``[^85]. O Alpine Linux faz o mesmo
tipo de proteção, todavia usando apenas a opção ``--with-pic`` no *script*
``configure``[^86], entretanto, estaremos fazendo o processo de recompilar as
bibliotecas manualmente pois assim temos um maior controle do que realmente vai
ser compilado com a tal opção, além de também estarmos tendo que "esconder" a
libbfd do linkeditor, a fim de evitar que outras bibliotecas ou programas façam
uso de sua API não-estável --- palavras da explicação feita no *commit* do
``xtraeme``, diga-se de passagem.

Sobre a opção ``-fPIC``, pois bem: o parâmetro ``-f`` significa, quase que num
"tratado" entre compiladores C atuais e não apenas no GCC, "*flag*" que, na
falta de uma boa tradução (e não, não é "bandeira"), funciona para dar instruções
adicionais ao compilador sobre como gerar o código de montagem, além do que já
lhe é passado pelo arquivo ``specs`` (o que já dissertamos sobre
anteriormente)[^87]; já "PIC" é um acrônimo para Código Independente de Posição
(ou "*Position Independent Code*", em inglês), é um conceito um bocado mais
difícil de explicar do que o que é uma "*flag*", mas vamos lá.

```sh


```


### GNU Multiple-Precision Arithmetic Library (ou simplesmente GMP)

#### 1º: Rode o *script* ``configure``

#### 2º: Compile e instale no sistema


### GNU Multiple Precision Floating-Point Reliable Library (ou simplesmente MPFR) 

#### 1º: Rode o *script* ``configure``

#### 2º: Compile e instale no sistema


### GNU ncurses

```sh
           ./configure --prefix=/usr \
            --mandir=/usr/share/man   \
            --with-shared             \
            --with-normal             \
            --without-debug           \
            --without-normal          \
            --enable-termcap          \
            --enable-pc-files         \
            --enable-widec            \
            --with-pkg-config-libdir=/usr/lib/pkgconfig
```

### Heirloom 2007

```sh
mv bin/* usr/bin/
```

```sh
for i in usr/bin/{STTY,bfs,cat,ch{grp,mod,own},copy,date,df{,space},du,echo,ed,expr,\
	{,f,e,p}grep,hostname,install,kill,lc,listusers,logname,ls,mk{dir,fifo,nod},mt,mvdir,\
	oawk,pathchk,ps,pwd,rm{,dir},sleep,stty,sync,tape{,cntl},tcopy,test,touch,tty,uname,w{,ho{,ami,do}}}; do
  cp -v $i bin/ \
  && rm -vf $i
done
```

```sh
mv usr/bin/logins usr/sbin/
```

### lobase

```sh
mkdir -p {s,}bin usr/ccs/bin
```

```sh
for i in usr/bin/{cat,chmod,cp,date,dd,domainname,false,install,kill,ln{,dir},mkdir,mv,pwd,readlink,rm{,dir},sed,shar,stat,true,vis}; do
  cp -v $i bin/$(basename $i) && rm -vf $i
done
```

```sh
for i in usr/bin/{lorder,mkdep,unifdef}; do
  cp -v $i usr/ccs/bin/$(basename $i) && rm -vf $i
done
```

# *“Faça, fuce, force, vá, não chore na porta...”*: Solucionando (e explicando) problemas

Essa seção é basicamente o "*troubleshooting*" da tabula: ela existe
justamente para explicar problemas que você talvez enfrente durante a compilação
do Copacabana e que normalmente não são explicados no Linux from Scratch e nem
no Musl-LFS, mas sim em erratas ou, no caso do Musl-LFS do Derrick, nas
"*issues*" --- algumas que eu mesmo tive a honra de fazer e contribuir --- as
quais citarei diversas vezes tanto ao longo dessa seção quanto ao longo da
tabula em si.  

## *“Meu ``ld`` na segunda parte da compilação da biblioteca C musl no sistema-base não está retornando o resultado esperado”*

Enquanto eu compilava o sistema-base do Copacabana no dia 22 de março de 2022, com
intuito de já fazer o primeiro lançamento oficial, eu encontrei este problema:

```
SEARCH_DIR("=/tools/x86_64-pindoramaCOPACABANA-linux-musl/lib64")
SEARCH_DIR("/tools/lib")
SEARCH_DIR("=/tools/x86_64-pindoramaCOPACABANA-linux-musl/lib")
```

Se você já leu sobre essa parte da compilação, possivelmente percebeu o erro
tratado aqui: o linkeditor não está usando os caminhos corretos para as
bibliotecas, mas sim os caminhos antigos da toolchain.  
Antes de continuar, se pergunte se você fez o reajuste e substituiu o binário do
linkeditor na parte de reajuste, se não, faça que o erro deve sumir.  
Caso contrário, venha comigo para a aventura de recompilar (parte d)a
toolchain... pois possivelmente você possivelmente esqueceu de limpar o
diretório do ``ld`` dentro do diretório ``build/`` das GNU Binutils antes de
criar o ``ld-new``, logo acabou com dois binários com nomes diferentes, mas com
uma mesma configuração.  
Para corrigir isso, apenas refaça a parte do novo binário para o linkeditor nas
instruções para compilar as GNU Binutils para a toolchain, só não se esqueça de
limpar o diretório antes com o ``gmake -C ld/ clean``.  

Esse erro originalmente foi percebido pelo próprio Derrick no Musl-LFS,
enquanto ele trabalhava na versão 10.0.0-RC1, e corrigido no *commit*
``19e881cd880ecd6fc8a6711c1c9038c2f3221381`` no dia 12 de dezembro de
2021.[12]

## *“O IPRoute2 simplesmente não compila, devolve um erro sobre "uma declaração estática de ``setns()`` seguindo uma declaração não-estática"”* 

Enquanto eu compilava o sistema-base do Copacabana em 17 de Fevereiro de 2022,
já aproximadamente chegando ao fim do processo e da lista de pacotes, eu
encontrei este problema:

```console
copacabana_chroot% gmake
sh configure /usr/include
TC schedulers
ATM no

libc has setns: no
SELinux support: no
libbpf support: no
ELF support: yes
libmnl support: no
Berkeley DB: no
need for strlcpy: yes
libcap support: yes

lib
CC libgenl.o
CC libnetlink.o
libnetlink.c:154:2: warning: #warning "libmnl required for error support" [-Wcpp]
154 | #warning "libmnl required for error support"
| ^~~~~~~
AR libnetlink.a
CC utils.o
In file included from utils.c:41:
../include/namespace.h:41:19: error: static declaration of 'setns' follows non-static declaration
41 | static inline int setns(int fd, int nstype)
| ^~~~~
In file included from ../include/namespace.h:5,
from utils.c:41:
/usr/include/sched.h:78:5: note: previous declaration of 'setns' was here
78 | int setns(int, int);
| ^~~~~
make[1]: *** [utils.o] Error 1
make: *** [all] Error 2
```

Este erro ocorre pois, como pode ser visto, o "sub-*script*" ``configure`` ---
este que é "chamado" pelo arquivo ``Makefile`` na linha 84 usando o
interpretador ``sh``, que em nossa toolchain seria o ``dash`` ---  falha em
identificar se a biblioteca C instalada no sistema contém uma implementação (?)
da chamada de sistema ``setns()`` --- por meio de uma checagem por meio de um
pequeno trecho de código em C que é gerado pela função ``check_setns()`` do
*script*, essa que é definida nas linhas 185 até 203 ---, essa que serve para
"mover" processos --- ou, como dito na página de manual, um fio de execução ---
de um *namespace* para outro, assim fazendo com que o iproute2 acabe usando sua
própria implementação.  

**Linhas 83 e 84, arquivo ``Makefile``:**
```makefile
config.mk:   
sh configure $(KERNEL_INCLUDE)
```  

**Linhas 185 até 203, arquivo ``configure``:**
```sh
check_setns()
{
    cat >$TMPDIR/setnstest.c <<EOF
#include <sched.h>
int main(int argc, char **argv)
{
        (void)setns(0,0);
        return 0;
}
EOF
    if $CC -I$INCLUDE -o $TMPDIR/setnstest $TMPDIR/setnstest.c >/dev/null 2>&1; then
        echo "IP_CONFIG_SETNS:=y" >>$CONFIG
        echo "yes"
        echo "CFLAGS += -DHAVE_SETNS" >>$CONFIG
    else
        echo "no"
    fi
    rm -f $TMPDIR/setnstest.c $TMPDIR/setnstest
}
```

O grande problema está no ponto em que sim, a biblioteca C musl tem sim uma
implementação da ``setns()``, que acaba conflitando com a implementação do
iproute2 e dando este erro na compilação, como se a função ``setns(int, int)``
em si tivesse sido declarada duas vezes.  
Além de ter sido experenciado por mim mesmo --- e, provavelmente qualquer um que
usou a toolchain de 25 de janeiro de 2022 ---, é também documentado num *commit*
feito em 16 de Julho de 2011 por Eric W. Biederman na árvore de desenvolvimento
principal do iproute2, implementando originalmente a função ``check_setns()``
no *script* ``configure``, a fim de resolver um outro erro --- extremamente
similar ao nosso, mas que foi provocado por outros fatores --- que havia sido
experienciado por Dan McGee, um desenvolvedor de software de Chicago que trabalhou
no projeto Arch Linux como desenvolvedor do gerenciador de pacotes Pacman e
mantenedor do *website* do projeto[], enquanto ele empacotava o iproute2[].  

Infelizmente, por uma questão de tempo e paciência, eu acabei por não conseguir
traçar a causa real desse erro.  
Entretanto, eu pude criar algumas teorias, e citarei duas delas aqui, da mais
provável para a menos provável:  

- Falha na instalação dos cabeçalhos do núcleo Linux por minha parte enquanto
  mantenedor/desenvolvedor único da distribuição --- como eu mesmo propus no
comentário que fiz na minha própria *issue* no Musl-LFS; 
- Má-configuração do arquivo specs do GCC no reajuste, somado ao linkeditor
  quebrado --- o que poderia ser questionado pois, mesmo assim, o
pré-processador ainda sim encontra o cabeçalho ``sched.h`` contendo a
implementação do ``setns(int, int)``, então de alguma forma os caminhos para o
diretório de cabeçalhos estão configurados corretamente;
- Falha na execução do *script* em si, por falta de ferramentas presentes na
  toolchain ou por essas não seguirem padrões atuais do POSIX.

De qualquer forma, eu consegui corrigir este erro utilizando a toolchain mais
recente, de 1 de Julho de 2022; agora o *script* de configuração do iproute2
(e de outros programas) finalmente consegue identificar a presença de funções na
biblioteca C.  

### Solução secundária 

Caso você esteja usando a toolchain antiga, algo que não recomendo pois você
pode acabar quebrando outros programas, a "solução" para esse erro seria
(re)forçar a presença da ``setns()``, editando o *script* ``configure`` e
removendo (ou simplesmente comentando) a parte da função ``check_setns()``
que, de fato, faz a checagem, como pode ser visto abaixo:

```sh
check_setns()
{
        echo "IP_CONFIG_SETNS:=y" >>$CONFIG
        echo "yes (forced)"
        echo "CFLAGS += -DHAVE_SETNS" >>$CONFIG
}
```

Em um formato de *diff*, a diferença seria essa:

```diff
187,195d186
<     cat >$TMPDIR/setnstest.c <<EOF
< #include <sched.h>
< int main(int argc, char **argv)
< {
<       (void)setns(0,0);
<       return 0;
< }
< EOF
<     if $CC -I$INCLUDE -o $TMPDIR/setnstest $TMPDIR/setnstest.c >/dev/null 2>&1; then
197c188
<       echo "yes"
---
>       echo "yes (forced)"
199,202d189
<     else
<       echo "no"
<     fi
<     rm -f $TMPDIR/setnstest.c $TMPDIR/setnstest
```

Este erro originalmente foi percebido por mim, Luiz Antônio, enquanto eu
trabalhava na versão 0.42 (codinome "El Mariachi") do Copacabana Linux, e então
reportado na *issue* ``#73`` no repositório do Musl-LFS no Microsoft GitHub no
dia 17 de Fevereiro de 2022[XY].  
Foi, por fim, consertado (ou ao menos, explicado?) no dia 2 de junho de 2022 por mim
mesmo na resposta ``1145479714`` à mesma *issue*[XX].

## *“O GNU m4 simplesmente não compila no sistema-base, devolve uma série de erros sobre "referência não-definida a \```error``'"”*

Enquanto eu compilava o sistema-base do Copacabana em 31 de Agosto de 2022, na
parte onde monta-se as ferramentas de desenvolvimento, eu encontrei este
problema:

```console
  CCLD     m4
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(clean-temp.o): in function `create_temp_dir':
/usr/src/cmp/m4-1.4.19/lib/clean-temp.c:234: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: /usr/src/cmp/m4-1.4.19/lib/clean-temp.c:249: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(clean-temp.o): in function `do_rmdir':
/usr/src/cmp/m4-1.4.19/lib/clean-temp.c:370: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: /usr/src/cmp/m4-1.4.19/lib/clean-temp.c:370: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: /usr/src/cmp/m4-1.4.19/lib/clean-temp.c:370: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(execute.o):/usr/src/cmp/m4-1.4.19/lib/execute.c:347: more undefined references to `error' follow
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(verror.o): in function `verror_at_line':
/usr/src/cmp/m4-1.4.19/lib/verror.c:68: undefined reference to `error_at_line'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: /usr/src/cmp/m4-1.4.19/lib/verror.c:70: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: /usr/src/cmp/m4-1.4.19/lib/verror.c:76: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(xalloc-die.o): in function `xalloc_die':
/usr/src/cmp/m4-1.4.19/lib/xalloc-die.c:34: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(xprintf.o): in function `xvprintf':
/usr/src/cmp/m4-1.4.19/lib/xprintf.c:50: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(xprintf.o): in function `xvfprintf':
/usr/src/cmp/m4-1.4.19/lib/xprintf.c:76: undefined reference to `error'
/tools/lib/gcc/x86_64-pindoramaCOPACABANA-linux-musl/10.3.1/../../../../x86_64-pindoramaCOPACABANA-linux-musl/bin/ld: ../lib/libm4.a(xprintf.o):/usr/src/cmp/m4-1.4.19/lib/xprintf.c:76: more undefined references to `error' follow
collect2: error: ld returned 1 exit status
gmake[2]: *** [m4] Error 1
gmake[2]: Leaving directory `/usr/src/cmp/m4-1.4.19/src'
gmake[1]: *** [all-recursive] Error 1
gmake[1]: Leaving directory `/usr/src/cmp/m4-1.4.19'
gmake: *** [all] Error 2
```

Este erro ocorre pois, como pode ser visto, não há uma definição das funções
``error`` e ``error_at_line``. Em outras palavras: elas aparentemente não
existem na nossa biblioteca C e o *script* ``configure`` não estava ciente
acerca disso, pois nós de fato temos um cabeçalho ``error.h``, mas que não tem
as devidas definições.  
Para corrigir isso, devemos --- assim como no Flex, no estágio da toolchain
intermediária --- forçar o GNU auto\*conf a não usar o ``sys/cdefs.h`` do
sistema-base e a usar a função ``error_at_line()`` e ``error()`` da Gnulib, ao
configurarmos as variáveis de cachê ``ac_cv_lib_error_at_line`` e
``ac_cv_header_sys_cdefs_h`` como "``no``", assim adicionando uma definição das
ditas. 

Este erro foi primeiramente descoberto, pelo que parece, por Daniel Kolesa, um
desenvolvedor do projeto Void Linux, enquanto ele trabalhava no arquivo para
compilar o GNU m4 pelo ``xbps-src`` presente no repositório void-packages, e
então corrigido por ele mesmo no *commit*
``4b6c115f475ec8d14047f01b3b4204d4293f59e8`` em 9 de Junho de 2021[ZW]; entretanto
ele não deu nenhuma explicação sobre o erro em si, apenas uma descrição genérica.
Já, no Copacabana, esse bug foi descoberto por mim, Luiz Antônio, enquanto eu
trabalhava na versão 0.42 (codinome "El Mariachi") do Copacabana Linux, e então
reportado na *issue* ``#81`` no repositório do Musl-LFS no Microsoft GitHub no
dia 30 de Agosto de 2022[ZZ]. E então foi, por fim, consertado no dia 31 de Agosto
de 2022 por mim mesmo na resposta ``1233496080`` à mesma *issue*[WW], assim como
também já foi corrigido na documentação em si (ou seja, esse erro está aqui para
fins históricos, pois não irá aparecer para você).


[^1]: https://webcache.googleusercontent.com/search?q=cache:Ls6QkZbwhsIJ:https://stat.ethz.ch/R-manual/R-devel/library/utils/help/untar.html+&cd=9&hl=pt-BR&ct=clnk&gl=br#:~:text=OpenBSD
[^2]: https://www.linuxfromscratch.org/museum/lfs-museum/8.4/LFS-BOOK-8.4-HTML/chapter05/gcc-pass2.html 
[^3]: https://www.ime.usp.br/~pf/algoritmos/apend/limits.h.html
	https://petbcc.ufscar.br/limits/
	https://en.wikipedia.org/wiki/C_data_types#limits.h
[^4]: https://gcc.gnu.org/onlinedocs/gccint/Driver.html
[^5]: https://github.com/dslm4515/Musl-LFS/issues/75#issuecomment-1098554540  
[^6]: https://github.com/dslm4515/Musl-LFS/commit/c8d6a00cca1105206ac622f3752c113871a1b39c  
[^7]:  "If you have already installed Autoconf on your system, you may have encountered  
	problems due to its strict M4 requirements. Autoconf demands to use GNU M4,  
	mostly due to it exceeding limitations present in other M4 implementations. As  
	noted by the Autoconf manual, this is not an onerous requirement, as it only  
	affects package maintainers who must regenerate `configure' scripts." (pág. 193 (?))  
	VAUGHN, Gary V.; ELLISON, Ben; TROMEY, Tom; TAYLOR, Ian Lance. GNU Autoconf, Automake, and Libtool. 1ª Edição.  
	Carmel, Indiana, E.U.A.: Sams, Outubro de 2000 
[^8]: https://invisible-island.net/ncurses/ncurses.faq.html#who_owns_it
[^9]: https://www.debian.org/doc/debian-policy/ch-files.html#scripts
[^10]: https://www.computer.org/csdl/api/v1/periodical/trans/ts/1976/02/01702350/13rRUxNEqRt/download-article/pdf
[^11]: http://web.archive.org/web/20170623013043/http://www.dtic.mil/get-tr-doc/pdf?AD=ADA611756
[^12]: https://www.gnu.org/software/bison/manual/bison.pdf
[^13]: https://www.linuxfromscratch.org/lfs/view/9.1-systemd/chapter06/bzip2.html
[^14]: https://unix.stackexchange.com/a/236928 
[^15]: https://github.com/ryanwoodsmall/heirloom-project/commits/musl
[^16]: https://github.com/Projeto-Pindorama/heirloom-070715/blob/copa-base/build/mk.config#L176-L177
[^17]: https://www.austingroupbugs.net/view.php?id=542
[^18]: https://www.dailymail.co.uk/sciencetech/article-3122303/Move-Lassie-IQ-tests-reveal-pigs-outsmart-dogs-chimpanzees.html
[^19]: https://web.archive.org/web/20160901200058/http://www.staff.science.uu.nl/~oostr102/docs/nawk/nawk_2.html 
[^20]: https://www.gnu.org/software/gawk/manual/html_node/POSIX_002fGNU.html
[^21]: http://www.darwinsys.com/file/
[^22]: https://github.com/brynet/file
[^23]: https://www.linuxfromscratch.org/lfs/view/9.1-systemd/index.html
	https://github.com/dslm4515/Musl-LFS/tree/stable-9.00/doc/2-toolchain
[^24]: https://github.com/sabotage-linux/gettext-tiny/blob/master/LICENSE
[^25]: https://github.com/sabotage-linux/gettext-tiny/blob/master/README.md 
[^26]: http://nickdesaulniers.github.io/blog/2016/08/13/object-files-and-symbols/
[^27]: https://gitlab.com/sortix/libz/blob/master/CHANGES 
[^28]: https://gitlab.com/sortix/libz/-/commit/611fd6a10e0ea22dfb7f08432b80fd02780d45de
[^29]: https://github.com/madler/pigz/blob/50d58f7c861600769fae9471b8961688eca7f46c/pigz.c#L6-L8
[^30]: https://github.com/madler/pigz/blob/master/pigz.c#L1-L26
[^31]: https://github.com/madler/pigz/blob/master/README
[^32]: https://git.savannah.gnu.org/cgit/gzip.git/tree/ChangeLog-2007#n1771
	https://git.savannah.gnu.org/cgit/gzip.git/tree/ChangeLog-2007#n1575
[^33]: http://gzip.org
[^34]: https://zlib.net
	https://www.gnu.org/software/gzip/
[^35]: https://web.archive.org/web/20090626052026/http://www.unisys.com/about__unisys/lzw/
[^36]: http://web.archive.org/web/20000815064543/http://www.gnu.org/philosophy/gif.html
[^37]: https://groups.csail.mit.edu/mac/projects/lpf/Patents/Gif/origCompuServe.html
[^38]: https://www.freebsd.org/cgi/man.cgi?make(1)#HISTORY
[^39]: http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.95.9198&rep=rep1&type=pdf
[^40]: https://git.savannah.gnu.org/cgit/make.git/tree/ChangeLog.1#n4976
[^41]: https://git.savannah.gnu.org/cgit/make.git/tree/ChangeLog.2#n3213
[^42]: https://invisible-island.net/diffstat/#dep_patch
[^43]: https://www.gnu.org/software/sed/manual/sed.html#Command_002dLine-Options
[^44]: http://schilytools.sourceforge.net
[^45]: https://invisible-island.net/autoconf/portability-tar.html
[^46]: https://groups.google.com/g/comp.unix.solaris/c/LqwQ16dkM7Y
	http://www.dnull.com/bsd/oldnews/bsdnew94791.html
[^47]: https://stackoverflow.com/a/70727324
	https://www.gnu.org/savannah-checkouts/gnu/autoconf/manual/autoconf-2.70/html_node/Cache-Variable-Names.html
[^48]: https://www.gnu.org/savannah-checkouts/gnu/autoconf/manual/autoconf-2.70/html_node/Particular-Functions.html#Particular-Functions
[^49]: http://clfs.org/view/clfs-sysroot/x86/final-system/flex.html
[^50]: https://www.linuxfromscratch.org/museum/lfs-museum/8.4/LFS-BOOK-8.4-HTML/chapter06/createfiles.html
[^51]: https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html 
[^52]: https://www.ibm.com/docs/en/xl-c-aix/13.1.2?topic=descriptions-qoptimize
	https://stackoverflow.com/a/34247001
[^53]: https://en.wikipedia.org/wiki/Code_motion
[^54]: https://stackoverflow.com/questions/69503317/bubble-sort-slower-with-o3-than-o2-with-gcc
[^55]: https://stackoverflow.com/questions/28875325/gcc-optimization-flag-o3-makes-code-slower-than-o2
[^56]: https://github.com/gcc-mirror/gcc/blob/releases/gcc-10.3.0/gcc/opts.c#L310-L398 
[^57]: https://gcc.gnu.org/onlinedocs/gcc/x86-Options.html 
[^58]: https://en.wikichip.org/wiki/amd/microarchitectures/zen_2#Compiler_support
[^59]: https://gcc.gnu.org/onlinedocs/gcc-10.4.0/gcc/Overall-Options.html
[^60]: https://www.kernel.org/doc/gorman/html/understand/understand016.html
[^61]: https://www.spinics.net/lists/kernel/msg4026980.html  
       https://github.com/dslm4515/Musl-LFS/issues/51
[^62]: https://www.kernel.org/doc/ols/2003/ols2003-pages-185-200.pdf  
	https://github.com/dslm4515/Musl-LFS/pull/61/commits/236b338a0201465a6e00d717e9ce0ada2a9f83d6
[^63]: https://github.com/alpinelinux/aports/blob/master/main/musl/handle-aux-at_base.patch#L1-L2
[^64]: https://resources.infosecinstitute.com/topic/what-are-packed-executables/
[^65]: https://www.musl-libc.org/doc/1.0.0/manual.html
[^66]: https://gcc.gnu.org/onlinedocs/gcc/Spec-Files.html
[^67]: http://sed.sourceforge.net/sedfaq.html
[^68]: https://www.oracle.com/technical-resources/articles/dulaney-sed.html
[^69]: https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html#:~:text=-Wl,option
[^70]: http://www.linker-aliens.org/blogs/ali/entry/new_crt_objects/
[^71]: https://dev.gentoo.org/~vapier/crt.txt
	https://en.wikipedia.org/wiki/Crt0#Example_crt0.s
[^72]: https://skarnet.org/software/skalibs/libskarnet.html
[^73]: https://skarnet.org/software/skalibs/index.html
[^74]: https://skarnet.org/software/nsss/
[^75]: https://skarnet.org/software/nsss/nsswitch.html
[^76]: "utmp − user information [...] This file allows one to discover information about who is
	currently using UNIX." (pág. 232)  
	"wtmp − user login history [...] This file records all logins and logouts." (pág. 233)  
	RITCHIE, Dennis M.; THOMPSON, Ken. UNIX PROGRAMMER’S MANUAL. 4ª Edição.  
	Murray Hill, Nova Jérsei, E.U.A.: Bell Telephone Laboratories, Inc., Novembro de 1973
[^77]: https://wiki.musl-libc.org/faq.html#Q:-Why-is-the-utmp/wtmp-functionality-only-implemented-as-stubs?
[^78]: https://skarnet.org/software/utmps/overview.html
[^79]: "utmp − user information [...] This file resides in directory /tmp." (pág. 232)  
	"wtmp − user login history [...] This file resides in directory /tmp." (pág. 233)  
	RITCHIE, Dennis M.; THOMPSON, Ken. UNIX PROGRAMMER’S MANUAL. 4ª Edição.  
	Murray Hill, Nova Jérsei, E.U.A.: Bell Telephone Laboratories, Inc., Novembro de 1973
[^80]: https://people.freedesktop.org/~dbn/pkg-config-guide.html#concepts
[^81]: https://www.linuxfromscratch.org/lfs/view/9.1/chapter06/glibc.html#conf-glibc
[^82]: https://git.alpinelinux.org/aports/commit/main/tzdata/APKBUILD?id=f67da5868d0420d8d466dffbc3655ce1239a1f3b
[^83]: https://en.wikipedia.org/wiki/Leap_second
	https://museum.seiko.co.jp/en/knowledge/story_01
[^84]: https://github.com/dslm4515/Musl-LFS/commit/5ee55e85ecfba776951ba8d0904d49577a56e3c9
[^85]: https://github.com/void-linux/void-packages/blob/eb68f14525fe488bc769f2229e82d111ae3c309d/srcpkgs/binutils/template#L34-L48
[^86]: https://git.alpinelinux.org/aports/tree/main/binutils/APKBUILD#n100
[^87]: https://gcc.gnu.org/onlinedocs/gcc/Code-Gen-Options.html

Nota[12]: https://github.com/dslm4515/Musl-LFS/commit/19e881cd880ecd6fc8a6711c1c9038c2f3221381i

Nota[]: https://archlinux.org/people/developer-fellows/#dan
Nota[]: https://patchwork.ozlabs.org/project/netdev/patch/m1mxgfkr3g.fsf@fess.ebiederm.org/
Nota[XY]: https://github.com/dslm4515/Musl-LFS/issues/73
Nota[XX]: https://github.com/dslm4515/Musl-LFS/issues/73#issuecomment-1145479714
Nota[ZW]: https://github.com/void-linux/void-packages/commit/4b6c115f475ec8d14047f01b3b4204d4293f59e8
Nota[ZZ]: https://github.com/dslm4515/Musl-LFS/issues/81
Nota[WW]: https://github.com/dslm4515/Musl-LFS/issues/81#issuecomment-1233496080
