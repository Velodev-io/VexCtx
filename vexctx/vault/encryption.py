import os
from abc import ABC, abstractmethod
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from vexctx.config import settings

class KEKProvider(ABC):
    @abstractmethod
    def get_kek(self) -> bytes:
        """Retrieve the Key Encryption Key (KEK)"""
        pass

class LocalKEKProvider(KEKProvider):
    def get_kek(self) -> bytes:
        path = settings.master_key_path_abs
        if os.path.exists(path):
            with open(path, "rb") as f:
                key = f.read()
                if len(key) == 32:
                    return key
        # If key doesn't exist or is invalid, generate one
        os.makedirs(os.path.dirname(path), exist_ok=True)
        new_key = AESGCM.generate_key(bit_length=256)
        with open(path, "wb") as f:
            f.write(new_key)
        # Secure file permissions (local read/write only)
        try:
            os.chmod(path, 0o600)
        except Exception:
            pass
        return new_key

class CloudKEKProvider(KEKProvider):
    def __init__(self, key_service_url: str = None):
        self.key_service_url = key_service_url

    def get_kek(self) -> bytes:
        # Mock cloud KEK provider - returns a stable test key
        # In a real environment, this requests a KEK from a cloud KMS/key service.
        return b"cloud_kek_placeholder_32bytes_!!"

class BYOKKEKProvider(KEKProvider):
    def __init__(self, key_id: str):
        self.key_id = key_id

    def get_kek(self) -> bytes:
        # Placeholder for BYOK interface
        raise NotImplementedError("BYOK KEK Provider is not implemented in v1.")

class EncryptionService:
    def __init__(self):
        self._provider = None

    def get_provider(self) -> KEKProvider:
        if self._provider is None:
            mode = settings.VEXCTX_KEK_PROVIDER
            if mode == "local":
                self._provider = LocalKEKProvider()
            elif mode == "cloud":
                self._provider = CloudKEKProvider()
            else:
                self._provider = LocalKEKProvider()
        return self._provider

    def set_provider(self, provider: KEKProvider):
        self._provider = provider

    def encrypt_envelope(self, plaintext: bytes) -> dict:
        """
        Envelope Encryption:
        1. Generate a random DEK (AES-256 key).
        2. Encrypt plaintext with DEK using AES-256-GCM.
        3. Retrieve KEK from the KEKProvider.
        4. Encrypt DEK with KEK using AES-256-GCM.
        5. Return encrypted DEK metadata, nonce, tag, and ciphertext.
        """
        # Generate DEK
        dek = AESGCM.generate_key(bit_length=256)
        
        # Encrypt plaintext with DEK
        content_nonce = os.urandom(12)
        aesgcm_dek = AESGCM(dek)
        encrypted_with_tag = aesgcm_dek.encrypt(content_nonce, plaintext, None)
        
        content_ciphertext = encrypted_with_tag[:-16]
        content_tag = encrypted_with_tag[-16:]

        # Retrieve KEK
        kek = self.get_provider().get_kek()
        
        # Encrypt DEK with KEK
        dek_nonce = os.urandom(12)
        aesgcm_kek = AESGCM(kek)
        encrypted_dek_with_tag = aesgcm_kek.encrypt(dek_nonce, dek, None)
        
        encrypted_dek = encrypted_dek_with_tag[:-16]
        dek_tag = encrypted_dek_with_tag[-16:]

        return {
            "encrypted_content": content_ciphertext.hex(),
            "nonce": content_nonce.hex(),
            "tag": content_tag.hex(),
            "encrypted_dek": encrypted_dek.hex(),
            "dek_nonce": dek_nonce.hex(),
            "dek_tag": dek_tag.hex()
        }

    def decrypt_envelope(self, encrypted_data: dict) -> bytes:
        """
        Decrypt Envelope:
        1. Retrieve KEK from the KEKProvider.
        2. Decrypt DEK using KEK, dek_nonce, and dek_tag.
        3. Decrypt ciphertext using DEK, nonce, and tag.
        """
        # Retrieve KEK
        kek = self.get_provider().get_kek()

        # Reconstruct encrypted DEK with tag
        encrypted_dek = bytes.fromhex(encrypted_data["encrypted_dek"])
        dek_tag = bytes.fromhex(encrypted_data["dek_tag"])
        dek_nonce = bytes.fromhex(encrypted_data["dek_nonce"])
        encrypted_dek_with_tag = encrypted_dek + dek_tag

        # Decrypt DEK
        aesgcm_kek = AESGCM(kek)
        dek = aesgcm_kek.decrypt(dek_nonce, encrypted_dek_with_tag, None)

        # Reconstruct content ciphertext with tag
        content_ciphertext = bytes.fromhex(encrypted_data["encrypted_content"])
        content_tag = bytes.fromhex(encrypted_data["tag"])
        content_nonce = bytes.fromhex(encrypted_data["nonce"])
        content_with_tag = content_ciphertext + content_tag

        # Decrypt plaintext
        aesgcm_dek = AESGCM(dek)
        plaintext = aesgcm_dek.decrypt(content_nonce, content_with_tag, None)
        
        return plaintext

encryption_service = EncryptionService()
