use strict;
use warnings;

my $SQ     = chr(39);   # '
my $DQ     = chr(34);   # "
my $TICK   = chr(96);   # `
my $BSLASH = chr(92);   # \

sub scan_js {
    my ($name, $src) = @_;
    my @stack;
    my $i     = 0;
    my $len   = length($src);
    my $state = 'code';
    my $prev  = '';
    my $line  = 1;
    my $err   = 0;
    my %close = ( ')' => '(', ']' => '[', '}' => '{' );
    my $prev_nonws = '';

    while ( $i < $len ) {
        my $c = substr( $src, $i, 1 );
        $line++ if $c eq "\n";

        if ( $state eq 'sq' ) {
            if ( $c eq $BSLASH ) { $i += 2; next; }
            $state = 'code' if $c eq $SQ;
            $i++; next;
        }
        if ( $state eq 'dq' ) {
            if ( $c eq $BSLASH ) { $i += 2; next; }
            $state = 'code' if $c eq $DQ;
            $i++; next;
        }
        if ( $state eq 'tpl' ) {
            if ( $c eq $BSLASH ) { $i += 2; next; }
            $state = 'code' if $c eq $TICK;
            $i++; next;
        }
        if ( $state eq 'lc' ) { $state = 'code' if $c eq "\n"; $i++; next; }
        if ( $state eq 'bc' ) {
            if ( $c eq '*' && substr( $src, $i + 1, 1 ) eq '/' ) { $state = 'code'; $i += 2; next; }
            $i++; next;
        }
        if ( $state eq 're' ) {
            if ( $c eq $BSLASH ) { $i += 2; next; }
            if ( $c eq '[' ) {
                $i++;
                while ( $i < $len ) {
                    my $d = substr( $src, $i, 1 );
                    if ( $d eq $BSLASH ) { $i += 2; next; }
                    last if $d eq ']';
                    $i++;
                }
                next;
            }
            if ( $c eq '/' || $c eq "\n" ) {
                $state = 'code';
                $i++;
                while ( $i < $len && substr( $src, $i, 1 ) =~ /[a-z]/ ) { $i++; }
                $prev = '/';
                next;
            }
            $i++; next;
        }

        # -- code state --
        if ( $c eq $SQ )     { $state = 'sq';   $i++; next; }
        if ( $c eq $DQ )     { $state = 'dq';   $i++; next; }
        if ( $c eq $TICK )   { $state = 'tpl';  $i++; next; }
        if ( $c eq '/' && substr( $src, $i + 1, 1 ) eq '/' ) { $state = 'lc'; $i += 2; next; }
        if ( $c eq '/' && substr( $src, $i + 1, 1 ) eq '*' ) { $state = 'bc'; $i += 2; next; }
        if ( $c eq '/' ) {
            if ( $prev eq '' || $prev =~ /[(,=:[!&|?{};+\-*%<>~^]/ ) { $state = 're'; $i++; next; }
            $i++; $prev = '/'; next;
        }
        if ( $c eq '(' || $c eq '[' || $c eq '{' ) {
            push @stack, [ $c, $line ];
            $prev = $c; $i++; next;
        }
        if ( $c eq ')' || $c eq ']' || $c eq '}' ) {
            if ( !@stack ) {
                print "  ERROR $name line $line: unmatched '$c'\n"; $err++;
            }
            else {
                my $top = pop @stack;
                if ( $top->[0] ne $close{$c} ) {
                    print "  ERROR $name line $line: '$c' does not close '$top->[0]' (opened line $top->[1])\n";
                    $err++;
                }
            }
            $prev = $c; $i++; next;
        }
        if ( $c !~ /\s/ ) { $prev = $c; }
        $i++;
    }

    if ( $state ne 'code' && $state ne 'lc' ) {
        print "  ERROR $name: unterminated $state at end of file\n"; $err++;
    }
    for my $open (@stack) {
        print "  ERROR $name: unclosed '$open->[0]' opened at line $open->[1]\n"; $err++;
    }
    print "  $name: OK (brackets/strings balanced)\n" if !$err;
    return $err;
}

my $file = shift @ARGV;
die "usage: perl .jscheck.tmp.pl <file>\n" unless defined $file;
open my $fh, '<', $file or die "cannot open $file: $!\n";
local $/;
my $src = <$fh>;
close $fh;

my $total = 0;

if ( $file =~ /\.html$/i ) {
    my $idx = 0;
    my $body = $src;
    while ( $body =~ m{<script(\s[^>]*)?>(.*?)</script>}gsi ) {
        my ( $attrs, $code ) = ( defined $1 ? $1 : '', $2 );
        next if $attrs =~ /\bsrc\s*=/i;
        $idx++;
        print "script block #$idx in $file:\n";
        $total += scan_js( $file, $code );
    }
    if ( $idx == 0 ) { print "  WARNING: no inline script found in $file\n"; }

    my $markup = $src;
    $markup =~ s{<script(\s[^>]*)?>.*?</script>}{}gsi;
    $markup =~ s{<!--.*?-->}{}gs;
    for my $tag (qw(div section form header h1 h2 h3 p span a label article main)) {
        my $open  = () = $markup =~ /<$tag(\s|>)/gi;
        my $close = () = $markup =~ m{</$tag>}gi;
        if ( $open != $close ) {
            print "  ERROR $file: <$tag> has $open opening and $close closing tags\n";
            $total++;
        }
    }
    print "  $file markup tags: OK\n" unless $total;
}
else {
    print "script in $file:\n";
    $total += scan_js( $file, $src );
}

print $total ? "RESULT: FAIL ($total issue(s))\n" : "RESULT: PASS\n";
exit( $total ? 1 : 0 );FIREBASE_PROJECT_ID=cmsterbaru
FIREBASE_PRIVATE_KEY_ID=f688567eb0f51e54c0506770ea49d308a92d8568
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1b9TvEALG4E40\nM1ZhzRRyVMMUP0aaJzsS7SpbYlSDKIVgMKklLh8SHijq+gvaSClW/UqhHoBIbCnq\nbRR+wHL3fVbFEvQBmYW0gBdhuMdwHK/5bpQ/zn7hSEf59w3GOBFqB2NBpTgGqsS/\n2ejSsx4SfR7Jb5S0TPdE0quWMzg2gS3fI1U0hW3eq6Ty3weTgLj8Ga4KVxVAL9af\ndJtp/T/MRaajjXX/wjfTrlwjsw6wqz7jjhgReAlcNK60OHAH/xw7yWpY+5uHvK1s\nPF4mhO8v4aR61rB1Ad5to6u5Gw/Idd592bd10WQoIFZPUUEJDiDN4grkC3GrqgKq\neznWNsSFAgMBAAECggEADYB1+xhY7I3SpAXR/tMxG1T9c2tGCMC0n7LwfP5zRZNl\nYYQdgjvNah6+csYKzcKi+Os+e4D2kO0jrWNSrCAMLiiwpVfEur2++nCxzL7gcJJh\n8hDtjVYDkSY83PgqmT6g5SAJnd/6rFxW6eQAdHWJ3lxbRyg7i7NSj1eSF0pWe4+/\nUK+bGFki+htGv9sFRdm1FSy9WPITh8Q4VE0hRm4ekIVdQYFa1/JbLk6Q0D6fvdDf\nTDGyTqnk4AvOL5Lt/hc/QninMTpIE4E4g+8fImkjK6joWGcX8CAEKOWz4LcE+PY9\n3CbqxdsZteees8xxcemlpgGWTqSSNlsurE/QNqzGAQKBgQDdUnpF11km2CvSxomg\n2lHypK+Emd7zLsVDyjQRHsAj4eMBsVDavRkDYV85IC35/wuqp8KHHKpMr3iHn1TJ\n8jlND9A4nAFUpTfEhXmzBZQrSSB0/VY0RPQonhlRJ517OIhtbzYfw0dSEfiQu880\nB8wmt3TfvjDPVzzN7RdwYryvBQKBgQDR3YBJKMZFEgi5z2+j4eq/5Cc1RDJmUKEA\ngy8ipY41Vxk4gY7ybr4/RwRiA2RTtnkLYqOYE4AgaUzpVPmc5eNX7SVbbCsuzXRf\nu8oDfv2YWCG3epeCykZ9pkodwvFXCx0CEee67lVkZIHrgWQQw/7dE//dgE2LjWlR\n85Z3Rs63gQKBgHEojmPPK0H1HNLzt8KKXYPWN/dwRNHJhAqZA+4M7uhpwgtHgbOV\nI4ja7Djk/xznDiv/AjLasSfsP4/4Iv3t3uZLw4ZuHTAOGWldZU/m9k77YKDwNncb\nGkr6Kq+XtakeyoJJbj7nNTv8/D3kCJjts6/H9PXA5GveirQvGODZWueRAoGBAKr2\n5EQ1KFgqWdttBoieSYvrhJlbJie9tXtiYyq5bgE8JDqpKNeMqgWIiCSEmN2tgCxr\nPdRsxmsg/Vv0MqjDipIdidpRY1hsXUqEBA0XDeZmnYkIIJeWyxgfOK/IGK2NSyNd\njMb206/GRSSisu8Ji/10BnPeys1N9Sei5cfjchGBAoGAcIC9ODrHzdmPD02jILwr\nwPde48qLFyN93fxsjMzz6CkqTNX7d0MaUSaQB/wYDCfH9HJBs+1GkZKUfT/AUwty\naAUOdffXeDWbpYnmN8YPUqqcoYyf+FpzHbmD3p41gqoD5bt6fWtg4Al/MxlGChv8\nkrfQn1BWJ+fnOnBfrY9WMPo=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cmsterbaru.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=108121471748526108964
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40cmsterbaru.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com