<?php
//
// Render the sample articles with league/commonmark (CommonMark + GFM + footnotes), for the parity test in the browser.
//
require __DIR__ . '/php/vendor/autoload.php';
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\Footnote\FootnoteExtension;
use League\CommonMark\MarkdownConverter;
$env = new Environment(['html_input' => 'allow']);
$env->addExtension(new CommonMarkCoreExtension()); $env->addExtension(new GithubFlavoredMarkdownExtension());
$c = new MarkdownConverter($env);
$out = [];
foreach (['start', 'plaktest'] as $k) $out[$k] = (string)$c->convert(file_get_contents(__DIR__ . "/data/$k.md"));
file_put_contents(__DIR__ . '/data/league-corpus.json', json_encode($out, JSON_UNESCAPED_UNICODE));
