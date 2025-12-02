#!/usr/bin/env ruby

# Disable SSL verification for local development
require 'openssl'
OpenSSL::SSL.const_set(:VERIFY_PEER, OpenSSL::SSL::VERIFY_NONE)

# Load Jekyll
require 'jekyll'
require 'mercenary'

# Run Jekyll serve command
Jekyll::PluginManager.require_from_bundler
Jekyll::Commands::Serve.init_with_program(Mercenary::Program.new(:jekyll))
Jekyll::Commands::Serve.process(['--host', '0.0.0.0'])
