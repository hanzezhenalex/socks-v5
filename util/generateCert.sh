# !/bin/bash

CERT_DIR="./cert"
mkdir "${CERT_DIR}"

# Create private key. This creates a 2048 bit private key using RSA algorithm.
openssl genrsa -out "${CERT_DIR}"/key.pem

# Create the CSR.
# The CSR contains vital information that is required by the Certificate Authority.
# It also includes the public key of your website/application that will be used to encrypt the data.
# However, the private key is not a part of the CSR.
openssl req -new -key "${CERT_DIR}"/key.pem -out "${CERT_DIR}"/csr.pem

# Create the SSL certificate
openssl x509 -req -days 30 -in "${CERT_DIR}"/csr.pem -signkey "${CERT_DIR}"/key.pem -out "${CERT_DIR}"/cert.pem